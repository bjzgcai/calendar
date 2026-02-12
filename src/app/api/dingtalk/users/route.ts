import { NextRequest, NextResponse } from "next/server";
import { getCorpAccessToken, getAllUsers, getDepartmentUserList, getDepartmentUserDetailList } from "@/lib/dingtalk";

/**
 * GET /api/dingtalk/users
 * 获取钉钉用户列表
 *
 * Query parameters:
 * - type: "simple" | "detailed" | "all" (default: "all")
 *   - simple: 获取简化用户信息（根部门）
 *   - detailed: 获取详细用户信息（根部门）
 *   - all: 获取所有部门的所有用户
 * - dept_id: 部门ID (仅在 type 为 simple 或 detailed 时有效)
 * - detailed: "true" | "false" (仅在 type 为 all 时有效，是否获取详细信息)
 * - search: 搜索关键词（模糊匹配用户名）
 */
export async function GET(request: NextRequest) {
  try {
    // 获取企业 access token
    const corpAccessToken = await getCorpAccessToken();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const deptId = searchParams.get("dept_id");
    const detailed = searchParams.get("detailed") === "true";
    const search = searchParams.get("search");

    let users: any[] = [];
    let metadata: any = {};

    if (type === "simple") {
      // 获取指定部门的简化用户列表
      const deptIdNum = deptId ? parseInt(deptId) : 1;
      const result = await getDepartmentUserList(corpAccessToken, deptIdNum);
      users = result.list || [];
      metadata = {
        type: "simple",
        dept_id: deptIdNum,
        has_more: result.has_more,
        next_cursor: result.next_cursor,
      };
    } else if (type === "detailed") {
      // 获取指定部门的详细用户列表
      const deptIdNum = deptId ? parseInt(deptId) : 1;
      const result = await getDepartmentUserDetailList(corpAccessToken, deptIdNum);
      users = result.list || [];
      metadata = {
        type: "detailed",
        dept_id: deptIdNum,
        has_more: result.has_more,
        next_cursor: result.next_cursor,
      };
    } else {
      // 获取所有用户
      users = await getAllUsers(corpAccessToken, detailed);
      metadata = {
        type: "all",
        detailed,
      };
    }

    // 如果有搜索关键词，过滤用户列表
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      users = users.filter((user: any) => {
        const name = user.name?.toLowerCase() || "";
        const userid = user.userid?.toLowerCase() || "";
        return name.includes(searchLower) || userid.includes(searchLower);
      });
    }

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching DingTalk users:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch DingTalk users",
      },
      { status: 500 }
    );
  }
}
