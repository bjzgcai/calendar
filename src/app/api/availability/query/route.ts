import { NextRequest, NextResponse } from "next/server";

const DEFAULT_TIMEZONE = "Asia/Shanghai";
const DEFAULT_WORKING_HOURS = { start: "08:00", end: "22:00" } as const;
const DEFAULT_PREFERRED_HOURS = { start: "09:00", end: "18:00" } as const;
const DEFAULT_MIN_SLOT_MINUTES = 30;
const DEFAULT_SLOT_STEP_MINUTES = 30;
const DEFAULT_MAX_RESULTS = 100;
const MAX_BUSY_RANGES = 5000;
const DEFAULT_ALLOWED_IPS = "219.142.122.2,125.35.71.202,125.35.71.206,42.247.105.2";

type TimeWindow = {
  start: string;
  end: string;
};

type BusyRange = {
  start: string;
  end: string;
};

type AvailabilityQueryRequest = {
  date: string;
  timezone: string;
  workingHours: TimeWindow;
  preferredHours: TimeWindow;
  minSlotMinutes: number;
  slotStepMinutes: number;
  maxResults: number;
  busyRanges: BusyRange[];
};

type Interval = {
  start: Date;
  end: Date;
};

type AvailabilitySlot = {
  start: string;
  end: string;
  durationMinutes: number;
  inPreferredWindow: boolean;
  rank: number;
};

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json(
    {
      error: { code, message },
    },
    { status }
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAllowedIps(): Set<string> {
  const raw = process.env.AVAILABILITY_ALLOWED_IPS || DEFAULT_ALLOWED_IPS;
  return new Set(raw.split(",").map((ip) => ip.trim()).filter(Boolean));
}

function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  if (ip === "::1") return "127.0.0.1";
  return ip;
}

function extractClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp?.trim()) return normalizeIp(xRealIp.trim());

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return normalizeIp(cfIp.trim());

  return null;
}

function isValidDateOnly(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= maxDay;
}

function isValidTimeHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(date: string, hhmm: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = hhmm.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const offset1 = getTimeZoneOffsetMs(utcGuess, timeZone);
  const adjusted = new Date(utcGuess.getTime() - offset1);
  const offset2 = getTimeZoneOffsetMs(adjusted, timeZone);

  if (offset1 !== offset2) {
    return new Date(utcGuess.getTime() - offset2);
  }
  return adjusted;
}

function parseBody(payload: unknown): { ok: true; data: AvailabilityQueryRequest } | { ok: false; message: string } {
  if (!isObject(payload)) {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const date = payload.date;
  if (typeof date !== "string" || !isValidDateOnly(date)) {
    return { ok: false, message: "date must be YYYY-MM-DD" };
  }

  const timezone = typeof payload.timezone === "string" ? payload.timezone : DEFAULT_TIMEZONE;
  if (!isValidTimeZone(timezone)) {
    return { ok: false, message: "timezone must be a valid IANA timezone name" };
  }

  const workingHoursRaw = payload.workingHours;
  const workingHours: TimeWindow =
    isObject(workingHoursRaw) && typeof workingHoursRaw.start === "string" && typeof workingHoursRaw.end === "string"
      ? { start: workingHoursRaw.start, end: workingHoursRaw.end }
      : { ...DEFAULT_WORKING_HOURS };
  if (!isValidTimeHHMM(workingHours.start) || !isValidTimeHHMM(workingHours.end)) {
    return { ok: false, message: "workingHours must use HH:MM format" };
  }
  if (hhmmToMinutes(workingHours.start) >= hhmmToMinutes(workingHours.end)) {
    return { ok: false, message: "workingHours.start must be earlier than workingHours.end" };
  }

  const preferredHoursRaw = payload.preferredHours;
  const preferredHours: TimeWindow =
    isObject(preferredHoursRaw) &&
    typeof preferredHoursRaw.start === "string" &&
    typeof preferredHoursRaw.end === "string"
      ? { start: preferredHoursRaw.start, end: preferredHoursRaw.end }
      : { ...DEFAULT_PREFERRED_HOURS };
  if (!isValidTimeHHMM(preferredHours.start) || !isValidTimeHHMM(preferredHours.end)) {
    return { ok: false, message: "preferredHours must use HH:MM format" };
  }
  if (hhmmToMinutes(preferredHours.start) >= hhmmToMinutes(preferredHours.end)) {
    return { ok: false, message: "preferredHours.start must be earlier than preferredHours.end" };
  }

  const minSlotMinutes = payload.minSlotMinutes ?? DEFAULT_MIN_SLOT_MINUTES;
  if (!isIntegerInRange(minSlotMinutes, 15, 240)) {
    return { ok: false, message: "minSlotMinutes must be an integer in [15, 240]" };
  }

  const slotStepMinutes = payload.slotStepMinutes ?? DEFAULT_SLOT_STEP_MINUTES;
  if (!isIntegerInRange(slotStepMinutes, 5, 120)) {
    return { ok: false, message: "slotStepMinutes must be an integer in [5, 120]" };
  }

  const maxResults = payload.maxResults ?? DEFAULT_MAX_RESULTS;
  if (!isIntegerInRange(maxResults, 1, 500)) {
    return { ok: false, message: "maxResults must be an integer in [1, 500]" };
  }

  if (!Array.isArray(payload.busyRanges)) {
    return { ok: false, message: "busyRanges must be an array" };
  }
  if (payload.busyRanges.length > MAX_BUSY_RANGES) {
    return { ok: false, message: `busyRanges must contain at most ${MAX_BUSY_RANGES} items` };
  }

  const busyRanges: BusyRange[] = [];
  for (const range of payload.busyRanges) {
    if (!isObject(range) || typeof range.start !== "string" || typeof range.end !== "string") {
      return { ok: false, message: "Each busyRanges item must include start and end date-time strings" };
    }
    const start = new Date(range.start);
    const end = new Date(range.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, message: "busyRanges timestamps must be valid RFC3339 date-times" };
    }
    if (start >= end) {
      return { ok: false, message: "busyRanges end must be greater than start" };
    }
    busyRanges.push({ start: range.start, end: range.end });
  }

  return {
    ok: true,
    data: {
      date,
      timezone,
      workingHours,
      preferredHours,
      minSlotMinutes,
      slotStepMinutes,
      maxResults,
      busyRanges,
    },
  };
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [{ start: sorted[0].start, end: sorted[0].end }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }

  return merged;
}

function computeFreeIntervals(workingStart: Date, workingEnd: Date, mergedBusy: Interval[]): Interval[] {
  const free: Interval[] = [];
  let cursor = workingStart;

  for (const busy of mergedBusy) {
    if (busy.start.getTime() > cursor.getTime()) {
      free.push({ start: cursor, end: busy.start });
    }
    if (busy.end.getTime() > cursor.getTime()) {
      cursor = busy.end;
    }
  }

  if (cursor.getTime() < workingEnd.getTime()) {
    free.push({ start: cursor, end: workingEnd });
  }

  return free;
}

function toAvailabilitySlots(
  freeIntervals: Interval[],
  preferredStart: Date,
  preferredEnd: Date,
  minSlotMinutes: number,
  slotStepMinutes: number,
  maxResults: number
): AvailabilitySlot[] {
  const minSlotMs = minSlotMinutes * 60 * 1000;
  const stepMs = slotStepMinutes * 60 * 1000;
  const preferredStartMs = preferredStart.getTime();
  const preferredEndMs = preferredEnd.getTime();

  const generated: Array<{
    startMs: number;
    endMs: number;
    inPreferredWindow: boolean;
  }> = [];

  for (const interval of freeIntervals) {
    let slotStartMs = interval.start.getTime();
    const intervalEndMs = interval.end.getTime();

    while (slotStartMs + minSlotMs <= intervalEndMs) {
      const slotEndMs = slotStartMs + minSlotMs;
      generated.push({
        startMs: slotStartMs,
        endMs: slotEndMs,
        inPreferredWindow: slotStartMs >= preferredStartMs && slotEndMs <= preferredEndMs,
      });
      slotStartMs += stepMs;
    }
  }

  generated.sort((a, b) => {
    if (a.inPreferredWindow !== b.inPreferredWindow) {
      return a.inPreferredWindow ? -1 : 1;
    }
    return a.startMs - b.startMs;
  });

  return generated.slice(0, maxResults).map((slot, index) => ({
    start: new Date(slot.startMs).toISOString(),
    end: new Date(slot.endMs).toISOString(),
    durationMinutes: minSlotMinutes,
    inPreferredWindow: slot.inPreferredWindow,
    rank: index,
  }));
}

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);
  const allowlist = parseAllowedIps();
  if (!clientIp || !allowlist.has(clientIp)) {
    return errorResponse(403, "IP_NOT_ALLOWED", "Source IP is not in allowlist.");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, "INVALID_ARGUMENT", "Request body must be valid JSON.");
  }

  const parsed = parseBody(rawBody);
  if (!parsed.ok) {
    return errorResponse(400, "INVALID_ARGUMENT", parsed.message);
  }

  const {
    date,
    timezone,
    workingHours,
    preferredHours,
    minSlotMinutes,
    slotStepMinutes,
    maxResults,
    busyRanges,
  } = parsed.data;

  const workingStart = zonedDateTimeToUtc(date, workingHours.start, timezone);
  const workingEnd = zonedDateTimeToUtc(date, workingHours.end, timezone);
  if (workingStart >= workingEnd) {
    return errorResponse(400, "INVALID_ARGUMENT", "workingHours produce an invalid time window.");
  }

  const preferredStart = zonedDateTimeToUtc(date, preferredHours.start, timezone);
  const preferredEnd = zonedDateTimeToUtc(date, preferredHours.end, timezone);
  if (preferredStart >= preferredEnd) {
    return errorResponse(400, "INVALID_ARGUMENT", "preferredHours produce an invalid time window.");
  }

  const clippedBusy: Interval[] = [];
  for (const range of busyRanges) {
    const start = new Date(range.start);
    const end = new Date(range.end);

    const clipStartMs = Math.max(start.getTime(), workingStart.getTime());
    const clipEndMs = Math.min(end.getTime(), workingEnd.getTime());
    if (clipStartMs < clipEndMs) {
      clippedBusy.push({
        start: new Date(clipStartMs),
        end: new Date(clipEndMs),
      });
    }
  }

  const mergedBusy = mergeIntervals(clippedBusy);
  const freeIntervals = computeFreeIntervals(workingStart, workingEnd, mergedBusy);
  const slots = toAvailabilitySlots(
    freeIntervals,
    preferredStart,
    preferredEnd,
    minSlotMinutes,
    slotStepMinutes,
    maxResults
  );

  return NextResponse.json({
    date,
    timezone,
    workingHours,
    preferredHours,
    slotCount: slots.length,
    slots,
  });
}
