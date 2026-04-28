# 中关村学院活动日历

基于 Next.js 16、React 19、PostgreSQL、Drizzle、shadcn/ui 和 Tailwind CSS v4 的活动日历系统。支持钉钉 SSO、海报 AI 解析、批量建活动、日历同步、筛选、海报生成和第三方空闲时间查询。

## 快速开始

```bash
pnpm install
pnpm dev
```

开发服务默认运行在 [http://localhost:5002](http://localhost:5002)。

常用命令：

```bash
pnpm build        # 生产构建
pnpm start        # 生产运行，端口 5002
pnpm lint         # ESLint
pnpm ts-check     # TypeScript 检查
pnpm test:unit    # Node 单元测试
pnpm test:e2e     # Playwright E2E
```

## 环境变量

最少需要：

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=至少32位随机字符串
```

常用可选项：

```bash
APP_BASE_URL=http://localhost:5002
ENABLE_DINGTALK_SSO=true
DINGTALK_APP_KEY=...
DINGTALK_APP_SECRET=...
DINGTALK_CORP_ID=...
ALERT_DINGTALK_USER_ID=...
SESSION_SECURE=true
OPENROUTER_API_KEY=...
POSTERS_STORAGE_PATH=storage/posters
THIRD_PARTY_API_KEY=...
AVAILABILITY_ALLOWED_IPS=127.0.0.1,::1
DINGTALK_WEBHOOK_URL=...
ENABLE_S3_STORAGE=false
AWS_S3_REGION=...
AWS_S3_BUCKET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

钉钉日历同步依赖 `dws` CLI：

```bash
curl -fsSL https://raw.githubusercontent.com/DingTalk-Real-AI/dingtalk-workspace-cli/main/scripts/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
dws auth login --client-id <app-key> --client-secret <app-secret>
```

## 项目结构

```text
src/app                         Next.js App Router 与 API routes
src/components                  日历、表单、筛选、详情、用户菜单等 UI
src/components/ui               shadcn/ui 基础组件
src/contexts/auth-context.tsx   登录状态与前端缓存
src/lib                         钉钉、会话、数据库、同步、节假日等服务
src/storage/database            Drizzle schema 与 eventManager
src/types                       前端类型
drizzle                         数据库迁移
tests                           单元测试与 Playwright E2E
skills                          本仓库技能与 API 示例
docs                            业务/部署/接口补充文档
```

注意：活动 schema 以 `src/storage/database/shared/schema.ts` 为准，`src/db/schema.ts` 不是当前主数据模型。

## 核心能力

- 活动年/月/周/日/列表视图，支持响应式布局。
- 活动创建、编辑、删除、筛选、标签、发起者、活动性质和“我的活动”。
- 精确日期或仅月份待定的活动。
- 重复活动、必须到场人员、图片上传和海报展示。
- 钉钉 OAuth 登录、JSAPI 初始化、组织用户选择。
- 钉钉日历同步：动态发现同步用户，拉取大规模参会日程，删除同步活动时写入 blocklist。
- OpenRouter/Qwen VL 海报解析与海报生成。
- `/api/availability/query` 空闲时间查询，配套 OpenAPI 文档在 `docs/openapi/availability-query.yaml`。

## 数据库

```bash
pnpm exec drizzle-kit migrate
```

主要表：

- `users`: 钉钉用户信息。
- `events`: 活动、时间、地点、发起者、活动性质、标签、重复规则、日期精度、必到人员、创建者、钉钉同步 ID。
- `dingtalk_deleted_events`: 手动删除的钉钉同步活动 blocklist。

## 部署

Linux 一键部署：

```bash
sudo ./deploy.sh
```

更多部署、PM2/systemd、钉钉同步和服务器说明见 [DEPLOY.md](DEPLOY.md)。

## 开发约定

- 只用 `pnpm`。
- 使用 `@/` 路径别名。
- 优先组合 `src/components/ui` 中的 shadcn/ui 组件。
- 服务端/API 才能导入数据库模块；客户端只导入类型、常量或接口。
- 修改 schema 时同步更新 Drizzle 迁移。
