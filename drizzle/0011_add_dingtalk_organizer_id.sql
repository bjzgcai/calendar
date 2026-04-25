-- Track the DingTalk organizer/source for each synced event.
-- This lets sync deletion reconcile only events owned by the same organizer.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "dingtalk_organizer_id" varchar(255);

CREATE INDEX IF NOT EXISTS "idx_events_dingtalk_organizer_id"
  ON "events" ("dingtalk_organizer_id");
