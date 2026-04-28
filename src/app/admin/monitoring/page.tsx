import type { Metadata } from "next"
import Link from "next/link"

import { AdminMonitoringDashboard } from "@/components/admin-monitoring-dashboard"
import { Button } from "@/components/ui/button"
import { isMonitoringAuthBypassEnabled } from "@/lib/monitoring"
import { getSession } from "@/lib/session"

export const metadata: Metadata = {
  title: "服务监控",
}

export default async function MonitoringPage() {
  const session = await getSession()
  const bypassAuth = isMonitoringAuthBypassEnabled()

  if (!session.isLoggedIn && !bypassAuth) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-10 text-slate-950">
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl font-semibold shadow-sm">
            监
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">需要登录</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            服务日志和告警状态只对已登录用户开放。
          </p>
          <Button asChild className="mt-7">
            <Link href="/api/auth/login">使用钉钉登录</Link>
          </Button>
        </div>
      </main>
    )
  }

  return <AdminMonitoringDashboard userName={session.name ?? (bypassAuth ? "开发模式" : "管理员")} />
}
