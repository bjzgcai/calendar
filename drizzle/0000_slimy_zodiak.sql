CREATE TYPE "public"."organization_type" AS ENUM('center', 'club', 'other');--> statement-breakpoint
CREATE TYPE "public"."recurrence_rule" AS ENUM('none', 'daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"link" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"location" varchar(255),
	"organizer" varchar(255) NOT NULL,
	"organization_type" "organization_type",
	"tags" text DEFAULT '' NOT NULL,
	"recurrence_rule" "recurrence_rule" DEFAULT 'none' NOT NULL,
	"recurrence_end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
