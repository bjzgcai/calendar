type EnvLike = Record<string, string | undefined>

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
