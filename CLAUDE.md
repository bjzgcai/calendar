# Event Calendar Management System

## Project Overview
Full-stack Next.js event calendar for managing college activities (中关村学院活动日历). Chinese-language app with DingTalk SSO, AI image parsing, and recurring events.

## Tech Stack
- **Framework**: Next.js 16.1 (App Router) + React 19.2
- **Database**: PostgreSQL + Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS v4
- **Calendar**: FullCalendar v6.1
- **Auth**: DingTalk OAuth + iron-session (cookie-based, 7-day TTL)
- **AI**: OpenRouter (Qwen VL Plus) for image analysis
- **Package Manager**: pnpm (enforced)

## Key Commands
```bash
pnpm dev         # Dev server on port 5002 (Turbopack)
pnpm build       # Production build
pnpm start       # Start production server on port 5002
```

## Structure
```
src/
├── app/
│   ├── page.tsx                    # Main calendar view (Suspense wrapper)
│   ├── layout.tsx                  # Root layout (AuthProvider + DingTalk init)
│   └── api/
│       ├── auth/                   # login, callback, user, logout, config
│       ├── events/                 # CRUD + tags + organizers
│       ├── analyze-image/          # AI poster → event metadata
│       ├── batch-parse-events/     # Batch image parsing
│       ├── upload/                 # Image upload
│       ├── posters/[filename]/     # Serve uploaded images
│       ├── dingtalk/users/         # Org user directory
│       └── holidays/check-update/  # Holiday sync
├── components/
│   ├── event-calendar.tsx          # FullCalendar wrapper
│   ├── event-form.tsx              # Create/edit form
│   ├── event-filter.tsx            # Filter sidebar
│   ├── event-detail.tsx            # Detail modal
│   ├── batch-create-events-dialog.tsx
│   ├── dingtalk-init.tsx           # JSAPI auto-login
│   ├── user-menu.tsx               # Profile dropdown
│   └── ui/                         # shadcn/ui components
├── contexts/auth-context.tsx       # Auth state + localStorage caching
├── lib/
│   ├── session.ts                  # iron-session config
│   ├── dingtalk.ts                 # OAuth + enterprise API
│   ├── db.ts                       # Drizzle pool
│   └── chinese-holidays.ts         # Holiday logic
├── storage/database/
│   ├── eventManager.ts             # CRUD operations
│   └── shared/schema.ts            # Drizzle schema
└── types/calendar.ts               # Type definitions
```

## Database Schema

**`events`**: id, title, content, imageUrl, link, startTime, endTime, location, organizer (text, comma-sep), organizationType, tags, eventType (text, comma-sep), datePrecision (exact/month), approximateMonth (YYYY-MM), recurrenceRule (none/daily/weekly/monthly), recurrenceEndDate, requiredAttendees (JSON), creatorId (FK→users), timestamps

**`users`**: id, dingtalkUserId, dingtalkUnionId, name, avatar, email, mobile, timestamps

**Organizers**: 7 hardcoded centers (CENTERS array in schema)

**Event Types**: academic_research, teaching_training, student_activities, industry_academia, administration, important_deadlines (with color mapping)

## Auth Flow
1. `/api/auth/login` → DingTalk OAuth redirect (hardcoded callback: `http://39.97.62.60:5002/api/auth/callback`)
2. `/api/auth/callback` → Exchange code, upsert user in DB, set iron-session
3. `/api/auth/user` → Return session user
4. DingTalk JSAPI auto-login in workbench via `dingtalk-init.tsx`

## Key Features
- **DingTalk SSO**: User-based creator tracking (replaced IP-based)
- **AI Image Analysis**: Qwen VL extracts event data from poster images; batch import supported
- **Recurring Events**: Daily (skips weekends)/weekly/monthly generation
- **Advanced Filters**: Date range, organizer, eventType, tags (AND logic), myEvents
- **Date Precision**: Exact datetime or month-only events
- **Required Attendees**: JSON array of required attendees per event
- **Responsive**: Desktop = week view, Mobile = day view

## API Endpoints
- `GET/POST /api/events` — List (FullCalendar format) / create
- `GET/PUT/DELETE /api/events/:id` — Single event
- `GET /api/events/tags` — Tag counts
- `GET /api/events/organizers` — Organizer list
- `POST /api/analyze-image` — AI poster analysis
- `POST /api/batch-parse-events` — Batch parse images
- `POST /api/upload` — Image upload
- `GET /api/dingtalk/users` — Org user directory (simple/detailed/all modes)
- `GET /api/auth/*` — Auth routes

## Environment Variables
```
# Required
DATABASE_URL / PGDATABASE_URL   # PostgreSQL
SESSION_SECRET                   # iron-session key (32+ chars)

# Auth
ENABLE_DINGTALK_SSO             # "true" to enable
DINGTALK_APP_KEY / APP_SECRET / CORP_ID
ALERT_DINGTALK_USER_ID          # DingTalk user ID(s) for fatal robot alerts
SESSION_SECURE                   # "true" for HTTPS-only cookies

# AI
OPENROUTER_API_KEY               # For Qwen VL image analysis

# Storage
ENABLE_S3_STORAGE               # "true" for S3 (default: local)
POSTERS_STORAGE_PATH            # Local poster path
```

## Deployment
- **Server**: Aliyun ECS at `39.97.62.60`
- **Process**: PM2 (`pnpm start`)
- **Deploy**: Use `/deploy_aliyun` skill or `deploy.sh` / `deploy-to-server.sh`

## Conventions
- Path alias: `@/*` → `./src/*`
- Client components: `"use client"` directive
- Organizer colors: Blue (centers), Green (clubs), Purple (other)
- Tags: space or hash-separated (`#tag`)
- Dates: ISO format with timezone support
- Migrations: `drizzle/` directory, run via `pnpm drizzle-kit migrate`
