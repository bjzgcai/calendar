-- Migration: Make organizer and eventType support multi-select (comma-separated values)

-- Change organizer from varchar(255) to text to support comma-separated values
ALTER TABLE "events" ALTER COLUMN "organizer" TYPE text;

-- Change eventType from enum to text to support comma-separated values
ALTER TABLE "events" ALTER COLUMN "event_type" TYPE text;
-- Drop the enum constraint if it exists (it will remain NULL compatible)
ALTER TABLE "events" ALTER COLUMN "event_type" DROP DEFAULT;
