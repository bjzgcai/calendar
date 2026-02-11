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
pnpm dev         # Dev server on port 5002 (with Turbopack)
pnpm build       # Production build
pnpm start       # Start production server on port 5002
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

