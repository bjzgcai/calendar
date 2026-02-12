# DingTalk User API Documentation

## API Endpoint

### GET `/api/dingtalk/users`

获取钉钉组织的用户列表。

#### Query Parameters

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `type` | string | `"all"` | 查询类型：<br>- `"simple"`: 获取指定部门的简化用户信息<br>- `"detailed"`: 获取指定部门的详细用户信息<br>- `"all"`: 获取所有部门的所有用户 |
| `dept_id` | number | `1` | 部门ID（仅在 type 为 `simple` 或 `detailed` 时有效） |
| `detailed` | boolean | `false` | 是否获取详细信息（仅在 type 为 `all` 时有效） |

#### Response Format

```json
{
  "success": true,
  "data": [
    {
      "userid": "user123",
      "name": "张三",
      "dept_id_list": [1, 2],
      "mobile": "13800138000",
      "email": "zhangsan@example.com",
      "title": "软件工程师",
      "active": true
    }
  ],
  "count": 1,
  "metadata": {
    "type": "all",
    "detailed": true
  },
  "timestamp": "2026-02-12T10:00:00.000Z"
}
```

#### Examples

**获取所有用户（简化信息）:**
```bash
curl http://localhost:5002/api/dingtalk/users?type=all
```

**获取所有用户（详细信息）:**
```bash
curl http://localhost:5002/api/dingtalk/users?type=all&detailed=true
```

**获取指定部门用户（简化信息）:**
```bash
curl http://localhost:5002/api/dingtalk/users?type=simple&dept_id=1
```

**获取指定部门用户（详细信息）:**
```bash
curl http://localhost:5002/api/dingtalk/users?type=detailed&dept_id=1
```

## CLI Test Script

项目提供了一个命令行测试脚本，可以直接调用 DingTalk API 并打印用户列表。

### 使用方法

```bash
# 获取根部门的简化用户列表
pnpm tsx scripts/test-dingtalk-users.ts

# 获取根部门的详细用户列表
pnpm tsx scripts/test-dingtalk-users.ts --detailed

# 获取指定部门的用户列表
pnpm tsx scripts/test-dingtalk-users.ts --dept-id=2

# 获取所有部门的所有用户
pnpm tsx scripts/test-dingtalk-users.ts --all

# 获取所有部门的所有用户（详细信息）
pnpm tsx scripts/test-dingtalk-users.ts --all --detailed
```

### 输出示例

```
🔐 正在获取钉钉企业 Access Token...
✅ Access Token 获取成功

📋 正在获取所有部门的详细用户列表...
✅ 成功获取 10 个用户

================================================================================
用户列表:
================================================================================

[1] 张三
  - User ID: user001
  - 部门ID列表: [1]
  - 手机: 13800138000
  - 邮箱: zhangsan@example.com
  - 职位: 软件工程师
  - 激活状态: 已激活

[2] 李四
  - User ID: user002
  - 部门ID列表: [1,2]
  - 手机: 13900139000
  - 邮箱: lisi@example.com
  - 职位: 产品经理
  - 激活状态: 已激活

...

================================================================================
总计: 10 个用户
================================================================================

📄 JSON 格式输出:
[...]
```

## Library Functions

在 `src/lib/dingtalk.ts` 中提供了以下函数：

### `getCorpAccessToken(): Promise<string>`

获取企业内部应用的 access_token。

### `getDepartmentUserList(corpAccessToken: string, deptId: number, cursor: number, size: number)`

获取指定部门的简化用户列表（不包含详细信息）。

**参数:**
- `corpAccessToken`: 企业 access token
- `deptId`: 部门ID（默认 1，根部门）
- `cursor`: 分页游标（默认 0）
- `size`: 每页大小（默认 100）

### `getDepartmentUserDetailList(corpAccessToken: string, deptId: number, cursor: number, size: number)`

获取指定部门的详细用户列表（包含手机、邮箱等信息）。

**参数:**
- `corpAccessToken`: 企业 access token
- `deptId`: 部门ID（默认 1，根部门）
- `cursor`: 分页游标（默认 0）
- `size`: 每页大小（默认 100）

### `getAllUsers(corpAccessToken: string, detailed: boolean): Promise<any[]>`

递归获取整个组织的所有用户（所有部门）。

**参数:**
- `corpAccessToken`: 企业 access token
- `detailed`: 是否获取详细信息（默认 false）

**返回:** 去重后的用户数组

### `getDepartmentList(corpAccessToken: string, deptId?: number)`

获取部门列表。

**参数:**
- `corpAccessToken`: 企业 access token
- `deptId`: 父部门ID（可选，不传则获取所有一级部门）

## Environment Variables

确保在 `.env` 文件中配置了以下环境变量：

```env
DINGTALK_CLIENT_ID=your_client_id
DINGTALK_CLIENT_SECRET=your_client_secret
DINGTALK_CORP_ID=your_corp_id
```

## Notes

- API 会自动去重用户（基于 userid）
- 递归获取所有用户时，从根部门（dept_id=1）开始遍历
- 简化版用户信息包含：userid, name, dept_id_list
- 详细版用户信息额外包含：mobile, email, title, job_number, active 等字段
