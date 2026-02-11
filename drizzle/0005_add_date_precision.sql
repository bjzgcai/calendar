-- 添加日期精确度支持
-- 用于支持"月份确定但日期不确定"的事件

-- 创建日期精确度枚举类型
DO $$ BEGIN
  CREATE TYPE "public"."date_precision" AS ENUM('exact', 'month');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 添加日期精确度列（默认为精确日期）
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "date_precision" "date_precision" DEFAULT 'exact' NOT NULL;

-- 添加近似月份列（格式：YYYY-MM，仅用于 date_precision 为 'month' 时）
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "approximate_month" varchar(7);

-- 创建索引以优化按月份查询
CREATE INDEX IF NOT EXISTS "idx_events_approximate_month" ON "events" ("approximate_month");

-- 添加注释
COMMENT ON COLUMN "events"."date_precision" IS '日期精确度：exact=精确日期时间, month=仅月份';
COMMENT ON COLUMN "events"."approximate_month" IS '近似月份（YYYY-MM格式），仅在date_precision为month时使用';
