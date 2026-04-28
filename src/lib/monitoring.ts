import { execFile } from "node:child_process"
import { promises as fs } from "node:fs"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const LOG_FILES = {
  "dingtalk-sync": "dingtalk-sync.log",
  "service-monitor": "service-monitor.log",
} as const

const ERROR_PATTERN = /error|failed|fatal|crash|exception|unhealthy|失败|错误|异常/i
const DEFAULT_LOG_LINES = 160
const DEFAULT_READ_BYTES = 96 * 1024

export type MonitoringLogId = keyof typeof LOG_FILES

export type MonitoringEnvStatus = {
  dingtalkAppKeyConfigured: boolean
  dingtalkAppSecretConfigured: boolean
  alertUserConfigured: boolean
  internalApiKeyConfigured: boolean
  pm2AppName: string
}

export type MonitoringLogSummary = {
  errorCount: number
  lastErrorLine: string | null
}

export type MonitoringLogSnapshot = {
  id: MonitoringLogId
  label: string
  path: string
  exists: boolean
  sizeBytes: number
  updatedAt: string | null
  lines: string[]
  summary: MonitoringLogSummary
}

export type MonitoringPm2Status = {
  appName: string
  status: "online" | "stopped" | "errored" | "missing" | "unavailable" | "unknown"
  restarts: number | null
  uptimeMs: number | null
  memoryBytes: number | null
  cpuPercent: number | null
  message?: string
}

export type MonitoringSnapshot = {
  generatedAt: string
  env: MonitoringEnvStatus
  pm2: MonitoringPm2Status
  logs: MonitoringLogSnapshot[]
}

type EnvSource = Record<string, string | undefined>

type Pm2Process = {
  name?: string
  monit?: {
    cpu?: number
    memory?: number
  }
  pm2_env?: {
    status?: string
    restart_time?: number
    pm_uptime?: number
  }
}

export function tailLines(content: string, maxLines = DEFAULT_LOG_LINES): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(-Math.max(0, maxLines))
}

export function summarizeLogLines(lines: string[]): MonitoringLogSummary {
  const errorLines = lines.filter((line) => ERROR_PATTERN.test(line))

  return {
    errorCount: errorLines.length,
    lastErrorLine: errorLines.at(-1) ?? null,
  }
}

export function buildMonitoringEnvStatus(env: EnvSource = process.env): MonitoringEnvStatus {
  return {
    dingtalkAppKeyConfigured: Boolean(env.DINGTALK_APP_KEY?.trim()),
    dingtalkAppSecretConfigured: Boolean(env.DINGTALK_APP_SECRET?.trim()),
    alertUserConfigured: Boolean(env.ALERT_DINGTALK_USER_ID?.trim()),
    internalApiKeyConfigured: Boolean(env.THIRD_PARTY_API_KEY?.trim()),
    pm2AppName: env.MONITOR_PM2_APP_NAME?.trim() || "calendar",
  }
}

export function isMonitoringAuthBypassEnabled(env: EnvSource = process.env): boolean {
  return env.NODE_ENV !== "production" && env.MONITORING_DEV_AUTH_BYPASS === "true"
}

function getLogPath(projectRoot: string, id: MonitoringLogId): string {
  return path.join(projectRoot, "logs", LOG_FILES[id])
}

async function readTail(filePath: string, maxBytes = DEFAULT_READ_BYTES): Promise<string> {
  const handle = await fs.open(filePath, "r")

  try {
    const stat = await handle.stat()
    const length = Math.min(stat.size, maxBytes)
    const offset = Math.max(0, stat.size - length)
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, offset)
    return buffer.toString("utf8")
  } finally {
    await handle.close()
  }
}

export async function getMonitoringLogSnapshot(
  id: MonitoringLogId,
  options: { projectRoot?: string; maxLines?: number; maxBytes?: number } = {}
): Promise<MonitoringLogSnapshot> {
  const filePath = getLogPath(options.projectRoot ?? process.cwd(), id)
  const label = id === "dingtalk-sync" ? "DingTalk sync" : "Service monitor"

  try {
    const [stat, content] = await Promise.all([
      fs.stat(filePath),
      readTail(filePath, options.maxBytes),
    ])
    const lines = tailLines(content, options.maxLines ?? DEFAULT_LOG_LINES)

    return {
      id,
      label,
      path: filePath,
      exists: true,
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
      lines,
      summary: summarizeLogLines(lines),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      const message = error instanceof Error ? error.message : String(error)
      return {
        id,
        label,
        path: filePath,
        exists: false,
        sizeBytes: 0,
        updatedAt: null,
        lines: [`Unable to read log file: ${message}`],
        summary: { errorCount: 1, lastErrorLine: message },
      }
    }

    return {
      id,
      label,
      path: filePath,
      exists: false,
      sizeBytes: 0,
      updatedAt: null,
      lines: [],
      summary: { errorCount: 0, lastErrorLine: null },
    }
  }
}

export async function getPm2Status(appName: string): Promise<MonitoringPm2Status> {
  try {
    const { stdout } = await execFileAsync("pm2", ["jlist"], { timeout: 5000 })
    const processes = JSON.parse(stdout) as Pm2Process[]
    const app = processes.find((item) => item.name === appName)

    if (!app) {
      return {
        appName,
        status: "missing",
        restarts: null,
        uptimeMs: null,
        memoryBytes: null,
        cpuPercent: null,
      }
    }

    const status = app.pm2_env?.status
    return {
      appName,
      status:
        status === "online" || status === "stopped" || status === "errored"
          ? status
          : "unknown",
      restarts: app.pm2_env?.restart_time ?? null,
      uptimeMs: app.pm2_env?.pm_uptime ? Date.now() - app.pm2_env.pm_uptime : null,
      memoryBytes: app.monit?.memory ?? null,
      cpuPercent: app.monit?.cpu ?? null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      appName,
      status: "unavailable",
      restarts: null,
      uptimeMs: null,
      memoryBytes: null,
      cpuPercent: null,
      message,
    }
  }
}

export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const env = buildMonitoringEnvStatus()
  const [pm2, dingtalkSyncLog, serviceMonitorLog] = await Promise.all([
    getPm2Status(env.pm2AppName),
    getMonitoringLogSnapshot("dingtalk-sync"),
    getMonitoringLogSnapshot("service-monitor"),
  ])

  return {
    generatedAt: new Date().toISOString(),
    env,
    pm2,
    logs: [dingtalkSyncLog, serviceMonitorLog],
  }
}
