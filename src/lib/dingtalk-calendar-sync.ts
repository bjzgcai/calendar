/**
 * DingTalk Calendar Sync Service
 * Syncs calendar events from dynamically discovered DingTalk users into the local calendar.
 */

import {
  getCorpAccessToken,
  getAllUserCalendarEvents,
  DingTalkCalendarEvent,
  getActiveDingTalkEventIdsForOrganizer,
  getDingTalkEventOrganizerId,
} from "./dingtalk"
import { getDirectDb } from "./db"
import { events, dingtalkDeletedEvents } from "@/storage/database/shared/schema"
import { eq, and, isNotNull, gte, lte } from "drizzle-orm"
import { resolveSyncUserIds } from "./sync-users-resolver"
import { getDingTalkSyncWindows } from "./dingtalk-sync-window"

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
    const syncWindows = getDingTalkSyncWindows()
    const timeMin = syncWindows[0].timeMin
    const timeMax = syncWindows[syncWindows.length - 1].timeMax

    const dtEventsById = new Map<string, DingTalkCalendarEvent>()
    for (const window of syncWindows) {
      const windowEvents = await getAllUserCalendarEvents(corpAccessToken, userId, {
        timeMin: window.timeMin.toISOString(),
        timeMax: window.timeMax.toISOString(),
      })
      for (const event of windowEvents) {
        dtEventsById.set(event.id, event)
      }
    }
    const dtEvents = Array.from(dtEventsById.values())

    const db = getDirectDb()

    // Load blocklist of manually-deleted DingTalk events
    const deletedRows = await db.select({ dingtalkEventId: dingtalkDeletedEvents.dingtalkEventId }).from(dingtalkDeletedEvents)
    const deletedBlocklist = new Set(deletedRows.map((r) => r.dingtalkEventId))

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

    // Build set of active DingTalk event IDs owned by the user/source being reconciled.
    const activeSourceDtIds = getActiveDingTalkEventIdsForOrganizer(activeEvents, userId, userId)

    // Fetch only DB events owned by this DingTalk organizer/source in the sync time window.
    // Legacy rows without dingtalk_organizer_id are intentionally not deleted.
    const dbEvents = await db
      .select({ id: events.id, dingtalkEventId: events.dingtalkEventId, title: events.title, content: events.content, location: events.location, startTime: events.startTime, endTime: events.endTime })
      .from(events)
      .where(
        and(
          isNotNull(events.dingtalkEventId),
          eq(events.dingtalkOrganizerId, userId),
          gte(events.startTime, timeMin),
          lte(events.startTime, timeMax)
        )
      )

    const dbEventByDtId = new Map(dbEvents.map((e) => [e.dingtalkEventId!, e]))

    // Delete events that are cancelled or no longer returned by DingTalk
    for (const dbEvent of dbEvents) {
      const dtId = dbEvent.dingtalkEventId!
      if (cancelledIds.has(dtId) || !activeSourceDtIds.has(dtId)) {
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

      if (deletedBlocklist.has(dtEvent.id)) {
        result.skipped++
        continue
      }

      const mapped = mapDingTalkEvent(dtEvent)
      if (!mapped) {
        result.skipped++
        continue
      }
      const dingtalkOrganizerId = getDingTalkEventOrganizerId(dtEvent, userId)

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
              dingtalkOrganizerId,
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
          dingtalkOrganizerId,
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
            dingtalkOrganizerId,
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
  const syncUserIds = await resolveSyncUserIds()
  const results: SyncResult[] = []

  for (const userId of syncUserIds) {
    results.push(await syncUserEvents(corpAccessToken, userId))
  }

  return results
}
