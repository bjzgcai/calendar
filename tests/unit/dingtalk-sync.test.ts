import assert from "node:assert/strict"
import test from "node:test"

import { hasValidInternalApiKey } from "../../src/lib/internal-api-auth"
import { buildDwsEventListArgs, buildDwsExecEnv } from "../../src/lib/dws-command-env"
import { getActiveDingTalkEventIdsForOrganizer, getDingTalkEventOrganizerId } from "../../src/lib/dingtalk"
import { getDingTalkSyncWindows } from "../../src/lib/dingtalk-sync-window"
import { SYNC_USER_NAMES } from "../../src/lib/sync-config"

test("DingTalk sync windows cover previous 30 days and next 365 days in 30-day chunks", () => {
  const now = new Date("2026-04-25T03:11:00.000Z")
  const windows = getDingTalkSyncWindows(now)

  assert.equal(windows[0].timeMin.toISOString(), "2026-03-26T03:11:00.000Z")
  assert.equal(windows.at(-1)?.timeMax.toISOString(), "2027-04-25T03:11:00.000Z")
  assert.deepEqual(windows.slice(0, 3).map(({ timeMin, timeMax }) => [timeMin.toISOString(), timeMax.toISOString()]), [
    ["2026-03-26T03:11:00.000Z", "2026-04-25T03:11:00.000Z"],
    ["2026-04-25T03:11:00.000Z", "2026-05-25T03:11:00.000Z"],
    ["2026-05-25T03:11:00.000Z", "2026-06-24T03:11:00.000Z"],
  ])

  const maxWindowMs = 30 * 24 * 60 * 60 * 1000
  assert.equal(windows.every(({ timeMin, timeMax }) => timeMax.getTime() - timeMin.getTime() <= maxWindowMs), true)
})

test("DWS exec env prepends the user-local bin directory", () => {
  const env = buildDwsExecEnv({ HOME: "/home/ecs-user", PATH: "/usr/bin:/bin" })

  assert.equal(env.PATH, "/home/ecs-user/.local/bin:/usr/bin:/bin")
})

test("DWS exec env does not duplicate user-local bin when already present", () => {
  const env = buildDwsExecEnv({ HOME: "/home/ecs-user", PATH: "/home/ecs-user/.local/bin:/usr/bin" })

  assert.equal(env.PATH, "/home/ecs-user/.local/bin:/usr/bin")
})

test("DWS event list args include a required 30-day time range", () => {
  const args = buildDwsEventListArgs(".result.events", new Date("2026-04-28T03:00:00.000Z"))

  assert.deepEqual(args, [
    "calendar",
    "event",
    "list",
    "--start",
    "2026-03-29T03:00:00.000Z",
    "--end",
    "2026-04-28T03:00:00.000Z",
    "-f",
    "json",
    "--jq",
    ".result.events",
  ])
})

test("internal API key auth accepts a matching x-api-key header", () => {
  const previous = process.env.THIRD_PARTY_API_KEY
  process.env.THIRD_PARTY_API_KEY = "sync-secret"

  try {
    const request = { headers: new Headers({ "x-api-key": "sync-secret" }) }
    assert.equal(hasValidInternalApiKey(request), true)
  } finally {
    if (previous === undefined) delete process.env.THIRD_PARTY_API_KEY
    else process.env.THIRD_PARTY_API_KEY = previous
  }
})

test("internal API key auth rejects missing, wrong, or unconfigured keys", () => {
  const previous = process.env.THIRD_PARTY_API_KEY

  try {
    process.env.THIRD_PARTY_API_KEY = "sync-secret"
    assert.equal(hasValidInternalApiKey({ headers: new Headers() }), false)
    assert.equal(hasValidInternalApiKey({ headers: new Headers({ "x-api-key": "wrong" }) }), false)

    delete process.env.THIRD_PARTY_API_KEY
    assert.equal(hasValidInternalApiKey({ headers: new Headers({ "x-api-key": "sync-secret" }) }), false)
  } finally {
    if (previous === undefined) delete process.env.THIRD_PARTY_API_KEY
    else process.env.THIRD_PARTY_API_KEY = previous
  }
})

test("fallback sync users include Gao Jing for known 50-plus attendee events", () => {
  assert.equal(SYNC_USER_NAMES.MXsvR7kqk4KgsXVriPke9ewiEiE, "高京")
})

test("DingTalk sync uses organizer id as the event source", () => {
  assert.equal(
    getDingTalkEventOrganizerId(
      {
        id: "event-1",
        calendarId: "primary",
        summary: "Demo",
        start: { dateTime: "2026-04-25T10:00:00+08:00" },
        end: { dateTime: "2026-04-25T11:00:00+08:00" },
        organizer: { id: "organizer-union-id", displayName: "Organizer" },
      },
      "fallback-union-id"
    ),
    "organizer-union-id"
  )

  assert.equal(
    getDingTalkEventOrganizerId(
      {
        id: "event-2",
        calendarId: "primary",
        summary: "Missing organizer",
        start: { dateTime: "2026-04-25T10:00:00+08:00" },
        end: { dateTime: "2026-04-25T11:00:00+08:00" },
      },
      "fallback-union-id"
    ),
    "fallback-union-id"
  )
})

test("DingTalk sync delete scope only includes active events for the source organizer", () => {
  const sourceIds = getActiveDingTalkEventIdsForOrganizer(
    [
      {
        id: "source-event",
        calendarId: "primary",
        summary: "Source",
        start: { dateTime: "2026-04-25T10:00:00+08:00" },
        end: { dateTime: "2026-04-25T11:00:00+08:00" },
        organizer: { id: "source-union-id", displayName: "Source" },
      },
      {
        id: "other-organizer-event",
        calendarId: "primary",
        summary: "Other",
        start: { dateTime: "2026-04-25T12:00:00+08:00" },
        end: { dateTime: "2026-04-25T13:00:00+08:00" },
        organizer: { id: "other-union-id", displayName: "Other" },
      },
      {
        id: "cancelled-source-event",
        calendarId: "primary",
        summary: "Cancelled",
        start: { dateTime: "2026-04-25T14:00:00+08:00" },
        end: { dateTime: "2026-04-25T15:00:00+08:00" },
        status: "cancelled",
        organizer: { id: "source-union-id", displayName: "Source" },
      },
    ],
    "source-union-id",
    "source-union-id"
  )

  assert.deepEqual([...sourceIds], ["source-event"])
})
