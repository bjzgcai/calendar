/**
 * 测试脚本：获取并打印钉钉用户列表
 *
 * 使用方法:
 * pnpm tsx scripts/test-dingtalk-users.ts [--detailed] [--dept-id=<id>]
 *
 * 参数:
 * --detailed: 获取详细用户信息（包括手机、邮箱等）
 * --dept-id=<id>: 指定部门ID（默认为1，即根部门）
 * --all: 获取所有部门的所有用户
 */

import { getCorpAccessToken, getAllUsers, getDepartmentUserList, getDepartmentUserDetailList } from "../src/lib/dingtalk";

async function main() {
  const args = process.argv.slice(2);
  const detailed = args.includes("--detailed");
  const all = args.includes("--all");
  const deptIdArg = args.find((arg) => arg.startsWith("--dept-id="));
  const deptId = deptIdArg ? parseInt(deptIdArg.split("=")[1]) : 1;

  console.log("🔐 正在获取钉钉企业 Access Token...");
  const corpAccessToken = await getCorpAccessToken();
  console.log("✅ Access Token 获取成功\n");

  let users: any[] = [];

  if (all) {
    console.log(`📋 正在获取所有部门的${detailed ? "详细" : "简化"}用户列表...`);
    users = await getAllUsers(corpAccessToken, detailed);
  } else if (detailed) {
    console.log(`📋 正在获取部门 ${deptId} 的详细用户列表...`);
    const result = await getDepartmentUserDetailList(corpAccessToken, deptId);
    users = result.list || [];
  } else {
    console.log(`📋 正在获取部门 ${deptId} 的简化用户列表...`);
    const result = await getDepartmentUserList(corpAccessToken, deptId);
    users = result.list || [];
  }

  console.log(`✅ 成功获取 ${users.length} 个用户\n`);
  console.log("=" .repeat(80));
  console.log("用户列表:");
  console.log("=".repeat(80));

  users.forEach((user, index) => {
    console.log(`\n[${index + 1}] ${user.name || user.nick || "未知"}`);
    console.log(`  - User ID: ${user.userid}`);

    if (user.dept_id_list) {
      console.log(`  - 部门ID列表: ${JSON.stringify(user.dept_id_list)}`);
    }

    if (user.mobile) {
      console.log(`  - 手机: ${user.mobile}`);
    }

    if (user.email) {
      console.log(`  - 邮箱: ${user.email}`);
    }

    if (user.title) {
      console.log(`  - 职位: ${user.title}`);
    }

    if (user.job_number) {
      console.log(`  - 工号: ${user.job_number}`);
    }

    if (user.active !== undefined) {
      console.log(`  - 激活状态: ${user.active ? "已激活" : "未激活"}`);
    }
  });

  console.log("\n" + "=".repeat(80));
  console.log(`总计: ${users.length} 个用户`);
  console.log("=".repeat(80));

  // 输出 JSON 格式（便于进一步处理）
  console.log("\n📄 JSON 格式输出:\n");
  console.log(JSON.stringify(users, null, 2));
}

main().catch((error) => {
  console.error("❌ 错误:", error.message);
  console.error(error);
  process.exit(1);
});
