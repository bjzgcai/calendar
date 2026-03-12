-- Make content and organizer nullable (schema allows null but DB still has NOT NULL constraint)
ALTER TABLE "events" ALTER COLUMN "content" DROP NOT NULL;
ALTER TABLE "events" ALTER COLUMN "organizer" DROP NOT NULL;
