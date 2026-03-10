/**
 * DingTalk Calendar Sync Service
 * Syncs calendar events from specified DingTalk users into the local calendar.
 */

import { getCorpAccessToken, getAllUserCalendarEvents, DingTalkCalendarEvent } from "./dingtalk"
import { getDirectDb } from "./db"
import { events } from "@/storage/database/shared/schema"
import { eq, and, isNotNull, gte, lte } from "drizzle-orm"

// unionIds of users whose calendars should be synced
const SYNC_USER_IDS = (process.env.DINGTALK_SYNC_USER_IDS || "Qfr1meiPqooG1l2jyZ5zOyQiEiE,e5JiPXxELQAEoNpZ50qLsnwiEiE,IgQRc4KPdJXQiPPBOEl3biiQiEiE")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)

export interface SyncResult {
  userId: string
  created: number
  updated: number
  deleted: number
  skipped: number
  error?: string
}

/**
 * Convert a DingTalk calendar event to our event DB record format.
 * Returns null if the event should be skipped (all-day parse failure, missing times).
 */
function mapDingTalkEvent(dtEvent: DingTalkCalendarEvent) {
  // Parse start time
  let startTime: Date
  let endTime: Date

  if (dtEvent.start.dateTime) {
    startTime = new Date(dtEvent.start.dateTime)
  } else if (dtEvent.start.date) {
    startTime = new Date(`${dtEvent.start.date}T00:00:00+08:00`)
  } else {
    return null
  }

  if (dtEvent.end.dateTime) {
    endTime = new Date(dtEvent.end.dateTime)
  } else if (dtEvent.end.date) {
    // All-day end is exclusive (next day), subtract 1 minute so it shows correctly
    const d = new Date(`${dtEvent.end.date}T00:00:00+08:00`)
    d.setMinutes(d.getMinutes() - 1)
    endTime = d
  } else {
    return null
  }

  // DingTalk API may return location as an object despite the type saying string
  const rawLocation = dtEvent.location as unknown
  const location =
    typeof rawLocation === "string" ? rawLocation || null
    : rawLocation && typeof rawLocation === "object"
      ? (rawLocation as { displayName?: string; title?: string }).displayName ||
        (rawLocation as { displayName?: string; title?: string }).title ||
        null
      : null

  return {
    title: dtEvent.summary || "(无标题)",
    content: dtEvent.description || "",  // NOT NULL in DB
    location,
    startTime,
    endTime,
  }
}

/**
 * Sync calendar events for a single DingTalk user (by unionId).
 * - Fetches events from past 30 days → next 365 days
 * - Creates new events, updates changed events, deletes removed/cancelled events
 */
async function syncUserEvents(corpAccessToken: string, userId: string): Promise<SyncResult> {
  const result: SyncResult = { userId, created: 0, updated: 0, deleted: 0, skipped: 0 }

  try {
    const timeMin = new Date()
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 5)

    const dtEvents = await getAllUserCalendarEvents(corpAccessToken, userId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    })

    const db = getDirectDb()

    // Partition: active vs cancelled events from DingTalk
    const activeEvents: DingTalkCalendarEvent[] = []
    const cancelledIds = new Set<string>()

    for (const dtEvent of dtEvents) {
      if (dtEvent.status === "cancelled") {
        cancelledIds.add(dtEvent.id)
      } else {
        activeEvents.push(dtEvent)
      }
    }

    // Build set of active DingTalk event IDs returned in this sync window
    const activeDtIds = new Set(activeEvents.map((e) => e.id))

    // Fetch all DB events with a dingtalkEventId within the sync time window
    const dbEvents = await db
      .select({ id: events.id, dingtalkEventId: events.dingtalkEventId, title: events.title, content: events.content, location: events.location, startTime: events.startTime, endTime: events.endTime })
      .from(events)
      .where(
        and(
          isNotNull(events.dingtalkEventId),
          gte(events.startTime, timeMin),
          lte(events.startTime, timeMax)
        )
      )

    const dbEventByDtId = new Map(dbEvents.map((e) => [e.dingtalkEventId!, e]))

    // Delete events that are cancelled or no longer returned by DingTalk
    for (const dbEvent of dbEvents) {
      const dtId = dbEvent.dingtalkEventId!
      if (cancelledIds.has(dtId) || !activeDtIds.has(dtId)) {
        await db.delete(events).where(eq(events.dingtalkEventId, dtId))
        result.deleted++
      }
    }

    // Upsert active events
    for (const dtEvent of activeEvents) {
      // Only sync events with more than 50 attendees
      if (!dtEvent.attendees || dtEvent.attendees.length <= 50) {
        result.skipped++
        continue
      }

      const mapped = mapDingTalkEvent(dtEvent)
      if (!mapped) {
        result.skipped++
        continue
      }

      const existing = dbEventByDtId.get(dtEvent.id)

      if (existing) {
        // Detect actual changes before updating
        const changed =
          existing.title !== mapped.title ||
          existing.content !== mapped.content ||
          existing.location !== (mapped.location ?? null) ||
          existing.startTime.getTime() !== mapped.startTime.getTime() ||
          existing.endTime.getTime() !== mapped.endTime.getTime()

        if (changed) {
          await db
            .update(events)
            .set({
              title: mapped.title,
              content: mapped.content,
              location: mapped.location,
              startTime: mapped.startTime,
              endTime: mapped.endTime,
              updatedAt: new Date(),
            })
            .where(eq(events.dingtalkEventId, dtEvent.id))
          result.updated++
        } else {
          result.skipped++
        }
      } else {
        // Create new event; onConflictDoUpdate handles duplicate dingtalkEventId
        // (e.g. event exists in DB outside current time-window query)
        await db.insert(events).values({
          ...mapped,
          organizer: "",
          tags: "",
          dingtalkEventId: dtEvent.id,
          recurrenceRule: "none",
          datePrecision: "exact",
        }).onConflictDoUpdate({
          target: events.dingtalkEventId,
          set: {
            title: mapped.title,
            content: mapped.content,
            location: mapped.location,
            startTime: mapped.startTime,
            endTime: mapped.endTime,
            updatedAt: new Date(),
          },
        })
        result.created++
      }
    }
  } catch (err) {
    const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause
    result.error = err instanceof Error
      ? `${err.message}${cause ? `\ncause: ${String(cause)}` : ""}`
      : String(err)
  }

  return result
}

/**
 * Sync calendar events for all configured users.
 */
export async function syncDingTalkCalendar(): Promise<SyncResult[]> {
  const corpAccessToken = await getCorpAccessToken()
  const results = await Promise.all(
    SYNC_USER_IDS.map((userId) => syncUserEvents(corpAccessToken, userId))
  )
  return results
}
