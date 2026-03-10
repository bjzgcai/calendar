-- Replace creator_ip with creator_id (FK to users)
ALTER TABLE "events" DROP COLUMN IF EXISTS "creator_ip";
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "creator_id" integer REFERENCES "users"("id");
