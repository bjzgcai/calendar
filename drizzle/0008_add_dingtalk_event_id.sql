-- Add dingtalk_event_id to events for tracking synced DingTalk calendar events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "dingtalk_event_id" varchar(255) UNIQUE;
