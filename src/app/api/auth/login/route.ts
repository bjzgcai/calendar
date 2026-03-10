import { NextRequest, NextResponse } from "next/server";
import { getDingTalkAuthUrl, isDingTalkSSOEnabled } from "@/lib/dingtalk";

export async function GET(request: NextRequest) {
  // 检查 DingTalk SSO 是否启用
  if (!isDingTalkSSOEnabled()) {
    return NextResponse.json(
      { error: "DingTalk SSO is not enabled" },
      { status: 403 }
    );
  }

  const redirectUri = "http://112.126.63.117:5002/api/auth/callback";

  // 生成随机 state 用于防止 CSRF 攻击
  const state = Math.random().toString(36).substring(7);

  // 获取 DingTalk 授权 URL
  const authUrl = getDingTalkAuthUrl(redirectUri, state);

  // 重定向到 DingTalk 登录页面
  return NextResponse.redirect(authUrl);
}
