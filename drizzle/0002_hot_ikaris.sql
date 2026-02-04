CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"dingtalk_user_id" varchar(255) NOT NULL,
	"dingtalk_union_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"avatar" text,
	"email" varchar(255),
	"mobile" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_dingtalk_user_id_unique" UNIQUE("dingtalk_user_id")
);
