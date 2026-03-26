import { NextRequest, NextResponse } from "next/server";
import { getDingTalkAuthUrl, isDingTalkSSOEnabled } from "@/lib/dingtalk";
import { getSession } from "@/lib/session";
import { getAppBaseUrl } from "@/lib/url";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  // 检查 DingTalk SSO 是否启用
  if (!isDingTalkSSOEnabled()) {
    return NextResponse.json(
      { error: "DingTalk SSO is not enabled" },
      { status: 403 }
    );
  }

  const session = await getSession();
  const state = randomBytes(16).toString("hex");
  session.oauthState = state;
  session.oauthStateExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  await session.save();

  // JSAPI auto-login flow can request a server-issued state first, then call callback directly.
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode === "state") {
    return NextResponse.json({ state });
  }

  const redirectUri = `${getAppBaseUrl(request)}/api/auth/callback`;

  // 获取 DingTalk 授权 URL
  const authUrl = getDingTalkAuthUrl(redirectUri, state);

  // 重定向到 DingTalk 登录页面
  return NextResponse.redirect(authUrl);
}
