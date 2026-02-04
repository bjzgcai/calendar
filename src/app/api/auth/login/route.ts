import { NextRequest, NextResponse } from "next/server";
import { getDingTalkAuthUrl } from "@/lib/dingtalk";

export async function GET(request: NextRequest) {
  // 获取当前应用的 URL 来构建回调地址
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = request.headers.get("host") || "localhost:5000";
  const redirectUri = `${protocol}://${host}/api/auth/callback`;

  // 生成随机 state 用于防止 CSRF 攻击
  const state = Math.random().toString(36).substring(7);

  // 获取 DingTalk 授权 URL
  const authUrl = getDingTalkAuthUrl(redirectUri, state);

  // 重定向到 DingTalk 登录页面
  return NextResponse.redirect(authUrl);
}
