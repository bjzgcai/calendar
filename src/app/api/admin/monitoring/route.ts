import { NextResponse } from "next/server"

import { requireLoggedIn } from "@/lib/api-auth"
import { getMonitoringSnapshot, isMonitoringAuthBypassEnabled } from "@/lib/monitoring"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!isMonitoringAuthBypassEnabled()) {
    const auth = await requireLoggedIn()
    if (!auth.ok) return auth.response
  }

  const snapshot = await getMonitoringSnapshot()

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
