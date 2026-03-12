CREATE TABLE "dingtalk_deleted_events" (
  "dingtalk_event_id" varchar(255) PRIMARY KEY NOT NULL,
  "deleted_at" timestamp with time zone NOT NULL DEFAULT now()
);
