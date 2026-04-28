type EnvLike = Record<string, string | undefined>

const DWS_EVENT_LIST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export function buildDwsExecEnv(baseEnv: EnvLike = process.env): EnvLike {
  const env = { ...baseEnv }
  const home = baseEnv.HOME
  const currentPath = baseEnv.PATH ?? ""

  if (!home) {
    env.PATH = currentPath
    return env
  }

  const localBin = `${home}/.local/bin`
  const pathParts = currentPath.split(":").filter(Boolean)
  env.PATH = pathParts.includes(localBin)
    ? currentPath
    : [localBin, ...pathParts].join(":")

  return env
}

export function buildDwsEventListArgs(jq: string, now = new Date()): string[] {
  const start = new Date(now.getTime() - DWS_EVENT_LIST_WINDOW_MS)

  return [
    "calendar",
    "event",
    "list",
    "--start",
    start.toISOString(),
    "--end",
    now.toISOString(),
    "-f",
    "json",
    "--jq",
    jq,
  ]
}
