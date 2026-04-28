# Agent Notes

Next.js 16 + React 19 calendar app for 中关村学院. Use `pnpm` only.

## Commands
- `pnpm dev` - local app on port 5002
- `pnpm build` / `pnpm start` - production build/run
- `pnpm lint`, `pnpm ts-check`, `pnpm test:unit`, `pnpm test:e2e`

## Map
- App Router/API: `src/app`
- UI: `src/components`, shadcn primitives in `src/components/ui`
- DB source of truth: `src/storage/database/shared/schema.ts`
- DB access: `src/storage/database/eventManager.ts`, `src/lib/db.ts`
- DingTalk sync: `src/lib/dingtalk-calendar-sync.ts`, `src/lib/sync-users-resolver.ts`
- Deploy/docs: `DEPLOY.md`, `docs/`

## Rules
- Keep client code away from server DB modules; import DB managers only in server/API code.
- Add schema changes in `src/storage/database/shared/schema.ts` and `drizzle/`.
- Preserve DingTalk SSO/session behavior and auth checks on mutating routes.
- Prefer existing shadcn/ui, Tailwind v4, `@/` imports, and current component patterns.
- Do not use stale `src/db/schema.ts` as the active schema reference.
