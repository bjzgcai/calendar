import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 返回当前登录用户的信息
    return NextResponse.json({
      userId: session.userId,
      dingtalkUserId: session.dingtalkUserId,
      name: session.name,
      avatar: session.avatar,
      email: session.email,
      isLoggedIn: session.isLoggedIn,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user info" },
      { status: 500 }
    );
  }
}
