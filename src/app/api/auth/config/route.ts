import { NextResponse } from "next/server";
import { isDingTalkSSOEnabled } from "@/lib/dingtalk";

export async function GET() {
  return NextResponse.json({
    ssoEnabled: isDingTalkSSOEnabled(),
  });
}
