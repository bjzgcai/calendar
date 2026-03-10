/**
 * DingTalk Calendar Sync Service
 * Syncs calendar events from specified DingTalk users into the local calendar.
 */

import { getCorpAccessToken, getAllUserCalendarEvents, DingTalkCalendarEvent } from "./dingtalk"
import { getDirectDb } from "./db"
import { events } from "@/storage/database/shared/schema"
import { eq } from "drizzle-orm"

// unionIds of users whose calendars should be synced
// Default: 吴衍标 (NSh5QJgQ0VyhbXTjkmZbrwiEiE), 邹猛 (z5ZXkpsuOBaqUDTXdWiP4cQiEiE)
const SYNC_USER_IDS = (process.env.DINGTALK_SYNC_USER_IDS || "NSh5QJgQ0VyhbXTjkmZbrwiEiE,z5ZXkpsuOBaqUDTXdWiP4cQiEiE")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)

export interface SyncResult {
  userId: string
  created: number
  updated: number
  skipped: number
  error?: string
}

/**
 * Convert a DingTalk calendar event to our event DB record format.
 * Returns null if the event should be skipped (e.g. cancelled).
 */
function mapDingTalkEvent(dtEvent: DingTalkCalendarEvent, creatorOpenId: string) {
  if (dtEvent.status === "cancelled") return null

  // Parse start time
  let startTime: Date
  let endTime: Date

  if (dtEvent.start.dateTime) {
    startTime = new Date(dtEvent.start.dateTime)
  } else if (dtEvent.start.date) {
    // All-day event: use midnight local time
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

  return {
    title: dtEvent.summary || "(无标题)",
    content: dtEvent.description || null,
    location: dtEvent.location || null,
    startTime,
    endTime,
    tags: "",
    dingtalkEventId: dtEvent.id,
  }
}

/**
 * Sync calendar events for a single DingTalk user (by unionId).
 */
async function syncUserEvents(corpAccessToken: string, userId: string): Promise<SyncResult> {
  const result: SyncResult = { userId, created: 0, updated: 0, skipped: 0 }

  try {
    // 1. Fetch events for the next 90 days (and past 30 days)
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - 30)
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 90)

    const dtEvents = await getAllUserCalendarEvents(corpAccessToken, userId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    })

    const db = getDirectDb()

    for (const dtEvent of dtEvents) {
      const mapped = mapDingTalkEvent(dtEvent, userId)
      if (!mapped) {
        result.skipped++
        continue
      }

      // 3. Check if event already exists by dingtalkEventId
      const existing = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.dingtalkEventId, dtEvent.id))
        .limit(1)

      if (existing.length > 0) {
        // Update if changed
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
        // Create new event
        await db.insert(events).values({
          ...mapped,
          recurrenceRule: "none",
          datePrecision: "exact",
        })
        result.created++
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
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
