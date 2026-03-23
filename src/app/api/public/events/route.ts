import { NextRequest, NextResponse } from "next/server";
import { eventManager } from "@/storage/database/eventManager";

const DEFAULT_TIMEZONE_OFFSET = "+08:00";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
  "Access-Control-Max-Age": "86400",
};

function withCorsJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

function isValidTimezoneOffset(timezoneOffset: string): boolean {
  return /^[+-](?:0\d|1\d|2[0-3]):[0-5]\d$/.test(timezoneOffset);
}

function isValidDateOnly(date: string): boolean {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= maxDay;
}

function parseDateRange(date: string, timezoneOffset: string): { dayStart: Date; dayEnd: Date } | null {
  if (!isValidDateOnly(date)) {
    return null;
  }

  const dayStart = new Date(`${date}T00:00:00.000${timezoneOffset}`);
  const dayEnd = new Date(`${date}T23:59:59.999${timezoneOffset}`);

  if (isNaN(dayStart.getTime()) || isNaN(dayEnd.getTime())) {
    return null;
  }

  return { dayStart, dayEnd };
}

function parseIntegerParam(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

function validateApiKey(request: NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  const expectedApiKey = process.env.THIRD_PARTY_API_KEY;
  if (!expectedApiKey) {
    return {
      ok: false,
      status: 503,
      error: "Public API key is not configured on server",
    };
  }

  const providedApiKey = request.headers.get("x-api-key");
  if (!providedApiKey || providedApiKey !== expectedApiKey) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized: invalid or missing x-api-key",
    };
  }

  return { ok: true };
}

/**
 * GET /api/public/events
 * Third-party event search by date.
 *
 * Query parameters:
 * - date (required): YYYY-MM-DD
 * - timezoneOffset (optional): defaults to +08:00, format ±HH:MM
 * - eventType (optional): comma-separated values
 * - organizer (optional): comma-separated values
 * - tags (optional): comma-separated values
 * - limit (optional): 1-500, default 100
 * - skip (optional): >=0, default 0
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.ok) {
      return withCorsJson(
        {
          success: false,
          error: auth.error,
        },
        auth.status
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const timezoneOffset = searchParams.get("timezoneOffset") || DEFAULT_TIMEZONE_OFFSET;
    const eventType = searchParams.get("eventType") || undefined;
    const organizer = searchParams.get("organizer") || undefined;
    const tags = searchParams.get("tags") || undefined;

    if (!date) {
      return withCorsJson(
        {
          success: false,
          error: "Missing required query parameter: date (YYYY-MM-DD)",
        },
        400
      );
    }

    if (!isValidTimezoneOffset(timezoneOffset)) {
      return withCorsJson(
        {
          success: false,
          error: "Invalid timezoneOffset format. Expected ±HH:MM, e.g. +08:00",
        },
        400
      );
    }

    const dateRange = parseDateRange(date, timezoneOffset);
    if (!dateRange) {
      return withCorsJson(
        {
          success: false,
          error: "Invalid date format. Expected YYYY-MM-DD",
        },
        400
      );
    }

    const limit = parseIntegerParam(searchParams.get("limit"), 100);
    const skip = parseIntegerParam(searchParams.get("skip"), 0);

    if (limit === null || limit < 1 || limit > 500) {
      return withCorsJson(
        {
          success: false,
          error: "Invalid limit. Expected an integer between 1 and 500",
        },
        400
      );
    }

    if (skip === null || skip < 0) {
      return withCorsJson(
        {
          success: false,
          error: "Invalid skip. Expected an integer greater than or equal to 0",
        },
        400
      );
    }

    const events = await eventManager.searchEventsByDate({
      dayStart: dateRange.dayStart,
      dayEnd: dateRange.dayEnd,
      eventType,
      organizer,
      tags,
      limit,
      skip,
    });

    return withCorsJson({
      success: true,
      data: events,
      count: events.length,
      query: {
        date,
        timezoneOffset,
        rangeStart: dateRange.dayStart.toISOString(),
        rangeEnd: dateRange.dayEnd.toISOString(),
        eventType: eventType || null,
        organizer: organizer || null,
        tags: tags || null,
        limit,
        skip,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error searching events by date:", error);
    return withCorsJson(
      {
        success: false,
        error: "Failed to search events by date",
      },
      500
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
