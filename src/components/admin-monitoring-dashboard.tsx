"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { MonitoringLogSnapshot, MonitoringSnapshot } from "@/lib/monitoring"

type AdminMonitoringDashboardProps = {
  userName: string
}

type SyncResultPayload = {
  success?: boolean
  summary?: {
    created?: number
    updated?: number
    deleted?: number
  }
  error?: string
  errors?: string[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return "未生成"

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

function formatBytes(value: number | null | undefined) {
  if (!value) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDuration(value: number | null | undefined) {
  if (!value || value < 0) return "未知"

  const minutes = Math.floor(value / 60000)
  if (minutes < 60) return `${minutes} 分钟`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时`

  return `${Math.floor(hours / 24)} 天`
}

function getToneClasses(tone: "good" | "warn" | "bad" | "neutral") {
  switch (tone) {
    case "good":
      return "border-emerald-200 bg-emerald-50 text-emerald-900"
    case "warn":
      return "border-amber-200 bg-amber-50 text-amber-950"
    case "bad":
      return "border-red-200 bg-red-50 text-red-950"
    default:
      return "border-slate-200 bg-white text-slate-950"
  }
}

function StatusPanel({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  tone: "good" | "warn" | "bad" | "neutral"
}) {
  return (
    <section className={`rounded-lg border p-4 shadow-sm ${getToneClasses(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-normal opacity-70">{label}</p>
          <p className="mt-2 text-xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/70">
          {icon}
        </div>
      </div>
      <p className="mt-3 min-h-5 text-sm opacity-80">{detail}</p>
    </section>
  )
}

function LogPanel({ log }: { log: MonitoringLogSnapshot }) {
  const hasErrors = log.summary.errorCount > 0

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold tracking-normal text-slate-950">{log.label}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(log.updatedAt)} · {formatBytes(log.sizeBytes)}
          </p>
        </div>
        <Badge variant={hasErrors ? "destructive" : "secondary"} className="rounded-md">
          {hasErrors ? `${log.summary.errorCount} 条异常` : "无异常"}
        </Badge>
      </div>

      {log.summary.lastErrorLine ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-950">
          <span className="font-medium">最近异常：</span>
          <span className="break-words">{log.summary.lastErrorLine}</span>
        </div>
      ) : null}

      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-slate-800">
        {log.lines.length > 0 ? log.lines.join("\n") : "暂无日志"}
      </pre>
    </section>
  )
}

export function AdminMonitoringDashboard({ userName }: AdminMonitoringDashboardProps) {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const loadSnapshot = useCallback(async () => {
    setRefreshing(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/monitoring", { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "监控数据读取失败")
      }

      setSnapshot(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadSnapshot()
  }, [loadSnapshot])

  const runSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/dingtalk/sync", { method: "POST" })
      const data = (await response.json()) as SyncResultPayload

      if (!response.ok || data.success === false) {
        const message = data.errors?.join("；") || data.error || "钉钉同步失败"
        throw new Error(message)
      }

      const summary = data.summary ?? {}
      setSyncMessage(
        `同步完成：新增 ${summary.created ?? 0}，更新 ${summary.updated ?? 0}，删除 ${summary.deleted ?? 0}`
      )
      await loadSnapshot()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      await loadSnapshot()
    } finally {
      setSyncing(false)
    }
  }

  const status = useMemo(() => {
    const totalErrors = snapshot?.logs.reduce((sum, log) => sum + log.summary.errorCount, 0) ?? 0
    const pm2Online = snapshot?.pm2.status === "online"
    const envReady = snapshot
      ? snapshot.env.dingtalkAppKeyConfigured &&
        snapshot.env.dingtalkAppSecretConfigured &&
        snapshot.env.alertUserConfigured &&
        snapshot.env.internalApiKeyConfigured
      : false

    return {
      totalErrors,
      pm2Online,
      envReady,
    }
  }, [snapshot])

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              <span>{userName}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">服务监控</h1>
            <p className="mt-2 text-sm text-slate-500">
              {snapshot ? `最后刷新 ${formatDate(snapshot.generatedAt)}` : "正在读取监控数据"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadSnapshot} disabled={refreshing || syncing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button onClick={runSync} disabled={syncing || loading}>
              <Play className="h-4 w-4" />
              {syncing ? "同步中" : "运行同步"}
            </Button>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
            {error}
          </div>
        ) : null}

        {syncMessage ? (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            {syncMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatusPanel
            icon={<Server className="h-5 w-5" />}
            label="PM2"
            value={snapshot?.pm2.status ?? "读取中"}
            detail={
              snapshot
                ? `${snapshot.pm2.appName} · 重启 ${snapshot.pm2.restarts ?? 0} · ${formatDuration(snapshot.pm2.uptimeMs)}`
                : "等待数据"
            }
            tone={!snapshot ? "neutral" : status.pm2Online ? "good" : "bad"}
          />
          <StatusPanel
            icon={<AlertTriangle className="h-5 w-5" />}
            label="日志异常"
            value={`${status.totalErrors}`}
            detail="最近日志窗口内的异常行"
            tone={!snapshot ? "neutral" : status.totalErrors > 0 ? "warn" : "good"}
          />
          <StatusPanel
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="告警配置"
            value={status.envReady ? "完整" : "缺失"}
            detail="AppKey、AppSecret、接收人、内部 API Key"
            tone={!snapshot ? "neutral" : status.envReady ? "good" : "bad"}
          />
          <StatusPanel
            icon={<Activity className="h-5 w-5" />}
            label="服务负载"
            value={snapshot?.pm2.cpuPercent != null ? `${snapshot.pm2.cpuPercent}%` : "未知"}
            detail={snapshot ? `内存 ${formatBytes(snapshot.pm2.memoryBytes)}` : "等待数据"}
            tone="neutral"
          />
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Clock3 className="h-4 w-4 text-slate-500" />
            <span>PM2 应用：{snapshot?.env.pm2AppName ?? "calendar"}</span>
            <span>钉钉应用：{snapshot?.env.dingtalkAppKeyConfigured ? "已配置" : "未配置"}</span>
            <span>告警接收人：{snapshot?.env.alertUserConfigured ? "已配置" : "未配置"}</span>
            <span>内部同步 Key：{snapshot?.env.internalApiKeyConfigured ? "已配置" : "未配置"}</span>
          </div>
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {snapshot?.logs.map((log) => <LogPanel key={log.id} log={log} />)}
          {!snapshot && loading ? (
            <>
              <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
              <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
            </>
          ) : null}
        </div>
      </div>
    </main>
  )
}
