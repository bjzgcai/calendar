import { NextResponse } from "next/server";
import { isDingTalkSSOEnabled } from "@/lib/dingtalk";

export async function GET() {
  return NextResponse.json({
    ssoEnabled: isDingTalkSSOEnabled(),
    clientId: process.env.DINGTALK_CLIENT_ID || "",
  });
}
