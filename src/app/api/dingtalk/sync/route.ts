import { NextResponse } from "next/server"
import { syncDingTalkCalendar } from "@/lib/dingtalk-calendar-sync"
import { requireLoggedIn } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const auth = await requireLoggedIn()
    if (!auth.ok) return auth.response

    const results = await syncDingTalkCalendar()

    const totalCreated = results.reduce((s, r) => s + r.created, 0)
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
    const totalDeleted = results.reduce((s, r) => s + r.deleted, 0)
    const errors = results.filter((r) => r.error).map((r) => `${r.userId}: ${r.error}`)

    return NextResponse.json({
      success: errors.length === 0,
      results,
      summary: { created: totalCreated, updated: totalUpdated, deleted: totalDeleted },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error("DingTalk calendar sync error:", err)
    const message = err instanceof Error ? err.message : String(err)
    const isAppCredentialError = message.includes("Illegal appKey or appSecret")
    return NextResponse.json(
      {
        success: false,
        error: isAppCredentialError
          ? "DingTalk app credential verification failed. Please check DINGTALK_APP_KEY/DINGTALK_APP_SECRET (or fallback DINGTALK_CLIENT_ID/DINGTALK_CLIENT_SECRET)."
          : message,
      },
      { status: 500 }
    )
  }
}
