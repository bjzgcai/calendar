export function getDingTalkSyncWindows(now = new Date()) {
  const pastTimeMin = new Date(now.getTime())
  pastTimeMin.setDate(pastTimeMin.getDate() - 30)

  const futureTimeMax = new Date(now.getTime())
  futureTimeMax.setDate(futureTimeMax.getDate() + 365)

  return [
    { timeMin: pastTimeMin, timeMax: new Date(now.getTime()) },
    { timeMin: new Date(now.getTime()), timeMax: futureTimeMax },
  ]
}
