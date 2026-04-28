import "server-only"

import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { getAllUsers, getCorpAccessToken } from "./dingtalk"
import { notifyDwsSyncUserResolverFailure } from "./dingtalk-alerts"
import { buildDwsExecEnv } from "./dws-command-env"
import { getDingTalkSyncWindows } from "./dingtalk-sync-window"
import { SYNC_USER_NAMES as FALLBACK_SYNC_USER_NAMES } from "./sync-config"

const execFileAsync = promisify(execFile)

const DWS_ATTENDEE_FILTER_JQ =
  "(.result.events // []) | map(select((.attendees|length) > 50) | {organizer: .organizer.displayName})"
const SYNC_USER_CACHE_TTL_MS = 10 * 60 * 1000

let cachedAt = 0
let cachedSyncUserNames: Record<string, string> | null = null

type DwsEventOrganizerRow = {
  organizer?: string | null
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function getOrganizerNamesFromDws(): Promise<string[]> {
  const names = new Set<string>()

  for (const window of getDingTalkSyncWindows()) {
    const { stdout } = await execFileAsync(
      "dws",
      [
        "calendar",
        "event",
        "list",
        "--start",
        window.timeMin.toISOString(),
        "--end",
        window.timeMax.toISOString(),
        "--format",
        "json",
        "--jq",
        DWS_ATTENDEE_FILTER_JQ,
      ],
      {
        env: buildDwsExecEnv() as NodeJS.ProcessEnv,
        maxBuffer: 10 * 1024 * 1024,
      }
    )

    const payload = JSON.parse(stdout.trim()) as DwsEventOrganizerRow[]

    for (const event of payload) {
      const organizerName = normalizeName(event.organizer)
      if (organizerName) {
        names.add(organizerName)
      }
    }
  }

  return Array.from(names)
}

async function mapOrganizerNamesToUnionIds(organizerNames: string[]): Promise<Record<string, string>> {
  if (organizerNames.length === 0) {
    return {}
  }

  const targetNames = new Set(organizerNames)
  const corpAccessToken = await getCorpAccessToken()
  const users = await getAllUsers(corpAccessToken, true)
  const resolved: Record<string, string> = {}

  for (const user of users) {
    const name = normalizeName((user as { name?: unknown }).name)
    if (!name || !targetNames.has(name)) {
      continue
    }

    const unionId = normalizeName((user as { unionid?: unknown; unionId?: unknown }).unionid)
      ?? normalizeName((user as { unionid?: unknown; unionId?: unknown }).unionId)
    if (!unionId) {
      continue
    }

    resolved[unionId] = name
  }

  return resolved
}

function cloneSyncMap(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map))
}

export function mergeSyncUserNames(dynamicNames: Record<string, string>): Record<string, string> {
  return {
    ...FALLBACK_SYNC_USER_NAMES,
    ...dynamicNames,
  }
}

export async function resolveSyncUserNames(): Promise<Record<string, string>> {
  const now = Date.now()
  if (cachedSyncUserNames && now - cachedAt < SYNC_USER_CACHE_TTL_MS) {
    return cloneSyncMap(cachedSyncUserNames)
  }

  try {
    const organizerNames = await getOrganizerNamesFromDws()
    const resolved = await mapOrganizerNamesToUnionIds(organizerNames)

    cachedSyncUserNames = mergeSyncUserNames(resolved)
  } catch (error) {
    console.warn("Failed to resolve sync users via dws. Falling back to static sync user list.", error)
    await notifyDwsSyncUserResolverFailure(error)
    cachedSyncUserNames = cloneSyncMap(FALLBACK_SYNC_USER_NAMES)
  }

  cachedAt = now
  return cloneSyncMap(cachedSyncUserNames)
}

export async function resolveSyncUserIds(): Promise<string[]> {
  const namesById = await resolveSyncUserNames()
  return Object.keys(namesById)
}
