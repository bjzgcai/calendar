import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getUserInfo, isDingTalkSSOEnabled } from "@/lib/dingtalk";
import { getSession } from "@/lib/session";
import { getDirectDb } from "@/lib/db";
import { users, User } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { getAppBaseUrl } from "@/lib/url";
import { notifyDingTalkFatalAlert } from "@/lib/dingtalk-alerts";

async function alertAuthFailure(reason: string, details?: string) {
  await notifyDingTalkFatalAlert({
    title: "DingTalk auth failed",
    source: "api/auth/callback",
    fatalInfo: details ? `${reason}\n\n${details}` : reason,
  });
}

export async function GET(request: NextRequest) {
  // 检查 DingTalk SSO 是否启用
  if (!isDingTalkSSOEnabled()) {
    return NextResponse.json(
      { error: "DingTalk SSO is not enabled" },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // 验证必要参数
  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  if (!state) {
    return NextResponse.json(
      { error: "Missing OAuth state" },
      { status: 400 }
    );
  }

  try {
    console.log("=== DingTalk Auth Callback Started ===");
    console.log("Code:", code);
    console.log("State:", state);

    const db = getDirectDb();

    // 1. 使用授权码获取访问令牌
    console.log("1. Getting access token...");
    const tokenData = await getAccessToken(code);
    console.log("Access token received:", tokenData.access_token ? "✓" : "✗");

    // 2. 使用访问令牌获取用户信息
    console.log("2. Getting user info...");
    const userInfo = await getUserInfo(tokenData.access_token);
    console.log("User info:", userInfo);

    // 3. 在数据库中查找或创建用户
    console.log("3. Checking database for user...");
    let user = await db
      .select()
      .from(users)
      .where(eq(users.dingtalkUserId, userInfo.openId))
      .limit(1)
      .then((rows: User[]) => rows[0]);

    if (!user) {
      // 创建新用户
      console.log("User not found, creating new user...");
      const newUsers = await db
        .insert(users)
        .values({
          dingtalkUserId: userInfo.openId,
          dingtalkUnionId: userInfo.unionId,
          name: userInfo.nick,
          avatar: userInfo.avatarUrl,
          email: userInfo.email,
          mobile: userInfo.mobile,
        })
        .returning();

      user = newUsers[0];
      console.log("New user created:", user.id);
    } else {
      // 更新现有用户信息
      console.log("User found, updating user info...");
      const updatedUsers = await db
        .update(users)
        .set({
          name: userInfo.nick,
          avatar: userInfo.avatarUrl,
          email: userInfo.email,
          mobile: userInfo.mobile,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      user = updatedUsers[0];
      console.log("User updated:", user.id);
    }

    // 4. 验证 OAuth state 并设置 session
    console.log("4. Setting session...");
    const session = await getSession();
    if (!session.oauthState || !session.oauthStateExpiresAt) {
      await alertAuthFailure("Invalid OAuth session state");
      return NextResponse.json(
        { error: "Invalid OAuth session state" },
        { status: 400 }
      );
    }

    if (Date.now() > session.oauthStateExpiresAt) {
      session.oauthState = undefined;
      session.oauthStateExpiresAt = undefined;
      await session.save();
      await alertAuthFailure("OAuth state expired");
      return NextResponse.json(
        { error: "OAuth state expired, please retry login" },
        { status: 400 }
      );
    }

    if (session.oauthState !== state) {
      await alertAuthFailure("OAuth state mismatch");
      return NextResponse.json(
        { error: "OAuth state mismatch" },
        { status: 400 }
      );
    }

    session.oauthState = undefined;
    session.oauthStateExpiresAt = undefined;
    session.userId = user.id;
    session.dingtalkUserId = user.dingtalkUserId;
    session.name = user.name;
    session.avatar = user.avatar || undefined;
    session.email = user.email || undefined;
    session.isLoggedIn = true;
    await session.save();
    console.log("Session saved successfully");

    // 5. 重定向回首页
    console.log("5. Redirecting to home page...");
    console.log("=== DingTalk Auth Callback Completed ===");
    return NextResponse.redirect(`${getAppBaseUrl(request)}/?view=year`);
  } catch (error) {
    console.error("DingTalk OAuth callback error:", error);
    await alertAuthFailure(
      "DingTalk OAuth callback crashed",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "Authentication failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
