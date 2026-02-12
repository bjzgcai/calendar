-- 添加必须到场的人字段
-- 存储必须参加活动的人员列表（来自钉钉）

-- 添加必须到场的人列表列（存储JSON数组）
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "required_attendees" text;

-- 添加注释
COMMENT ON COLUMN "events"."required_attendees" IS '必须到场的人列表（JSON数组：[{userid, name}]）';
