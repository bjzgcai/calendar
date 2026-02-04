import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getUserInfo } from "@/lib/dingtalk";
import { getSession } from "@/lib/session";
import { getDirectDb } from "@/lib/db";
import { users, User } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
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

    // 4. 设置 session
    console.log("4. Setting session...");
    const session = await getSession();
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
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("DingTalk OAuth callback error:", error);
    return NextResponse.json(
      { error: "Authentication failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
