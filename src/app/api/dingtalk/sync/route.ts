import { NextResponse } from "next/server"
import { syncDingTalkCalendar } from "@/lib/dingtalk-calendar-sync"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const results = await syncDingTalkCalendar()

    const totalCreated = results.reduce((s, r) => s + r.created, 0)
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
    const errors = results.filter((r) => r.error).map((r) => `${r.staffId}: ${r.error}`)

    return NextResponse.json({
      success: errors.length === 0,
      results,
      summary: { created: totalCreated, updated: totalUpdated },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error("DingTalk calendar sync error:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
