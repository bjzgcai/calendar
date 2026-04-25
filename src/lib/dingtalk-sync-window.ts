const SYNC_PAST_DAYS = 30
const SYNC_FUTURE_DAYS = 365
const MAX_SYNC_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export function getDingTalkSyncWindows(now = new Date()) {
  const pastTimeMin = new Date(now.getTime())
  pastTimeMin.setDate(pastTimeMin.getDate() - SYNC_PAST_DAYS)

  const futureTimeMax = new Date(now.getTime())
  futureTimeMax.setDate(futureTimeMax.getDate() + SYNC_FUTURE_DAYS)

  const windows: Array<{ timeMin: Date; timeMax: Date }> = []
  let cursor = pastTimeMin.getTime()
  const end = futureTimeMax.getTime()
  const maxWindowMs = MAX_SYNC_WINDOW_DAYS * DAY_MS

  while (cursor < end) {
    const next = Math.min(cursor + maxWindowMs, end)
    windows.push({
      timeMin: new Date(cursor),
      timeMax: new Date(next),
    })
    cursor = next
  }

  return windows
}
