# Event Calendar Management System

## Project Overview
Full-stack Next.js event calendar for managing college activities (中关村学院活动日历). Chinese-language app with event filtering, creator tracking, and recurring events.

## Tech Stack
- **Framework**: Next.js 16.1 (App Router) + React 19.2
- **Database**: PostgreSQL + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS v4
- **Calendar**: FullCalendar v6.1
- **Forms**: React Hook Form + Zod validation
- **Package Manager**: pnpm (enforced)

## Key Commands
```bash
coze dev         # Dev server on port 5000
coze build       # Production build
pnpm install     # Install dependencies
```

## Structure
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main calendar view
│   └── api/events/        # Event CRUD endpoints
├── components/
│   ├── event-calendar.tsx # FullCalendar wrapper
│   ├── event-form.tsx     # Create/edit form
│   ├── event-filter.tsx   # Filter sidebar
│   └── ui/                # shadcn/ui components
├── storage/database/
│   ├── eventManager.ts    # CRUD operations class
│   └── shared/schema.ts   # Drizzle schema
└── types/calendar.ts      # Type definitions
```

## Database Schema
**events** table: `id`, `title`, `content`, `imageUrl`, `link`, `startTime`, `endTime`, `location`, `organizer`, `organizationType` (enum: center/club/other), `tags`, `recurrenceRule`, `creatorIp`, timestamps

**Organizers**: 7 centers + student club + other (hardcoded in schema)

## Key Features
- **Creator Tracking**: IP-based event ownership for "My Events" filtering
- **Recurring Events**: Daily/weekly/monthly generation (daily skips weekends)
- **Advanced Filters**: Date range, organizer, tags (AND logic), creator IP
- **Responsive**: Desktop = week view, Mobile = day view
- **File Uploads**: Local storage in `/public/posters` with timestamp-based naming

## API Endpoints
- `GET/POST /api/events` - List/create events
- `GET/PUT/DELETE /api/events/:id` - Individual event operations
- `GET /api/events/tags` - Tag list with counts
- `GET /api/events/organizers` - Organizer list
- `POST /api/upload` - Image upload

## Conventions
- Path alias: `@/*` → `./src/*`
- Client components: Mark with `"use client"`
- Organizer colors: Blue (centers), Green (clubs), Purple (other)
- Tags format: Space or hash-separated (#tag)
- Date handling: ISO format with timezone support

## Environment Variables
Required: `DATABASE_URL`, `PGDATABASE_URL` (PostgreSQL connection)
Optional: DingTalk integration vars

## color tag
1. 在筛选条件中, 新增活动类型选项, 以便用户根据活动性质进行筛选和管理。以下是新增的活动类型及其对应的颜色标识:

学术研究 🔵 蓝色

学术讲座、研讨会、论文分享会、读书会
AI前沿技术交流、学术报告

教学培训 🟢 绿色
课程安排、工作坊、技术培训
AI技能培训、认证考试

学生活动 🟠 橙色
学生俱乐部活动、竞赛、社团活动
黑客马拉松、项目展示

产学研合作 🟣 紫色
企业合作项目、技术对接会
产业论坛、创新孵化

行政管理 ⚪ 灰色
内部会议、评审会、审核流程
行政事务、部门协调

重要截止 🔴 红色
申请截止、项目交付节点
考试日期、重要里程碑
