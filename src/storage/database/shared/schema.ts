import { pgTable, serial, varchar, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// 重复规则枚举
export const recurrenceRuleEnum = pgEnum("recurrence_rule", [
  "none",
  "daily",
  "weekly",
  "monthly",
])

// 活动类型枚举
export const organizationTypeEnum = pgEnum("organization_type", [
  "center",
  "club",
  "other",
])

// 用户表 - 存储 DingTalk 用户信息
export const users = pgTable("users", {
  id: serial("id").primaryKey().notNull(),
  dingtalkUserId: varchar("dingtalk_user_id", { length: 255 }).notNull().unique(),
  dingtalkUnionId: varchar("dingtalk_union_id", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: text("avatar"),
  email: varchar("email", { length: 255 }),
  mobile: varchar("mobile", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const events = pgTable("events", {
  id: serial("id").primaryKey().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  link: text("link"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  location: varchar("location", { length: 255 }),
  organizer: varchar("organizer", { length: 255 }).notNull(),
  organizationType: organizationTypeEnum("organization_type"),
  tags: text("tags").notNull().default(""),
  recurrenceRule: recurrenceRuleEnum("recurrence_rule").notNull().default("none"),
  recurrenceEndDate: timestamp("recurrence_end_date", { withTimezone: true }),
  creatorId: integer("creator_id").references(() => users.id), // 创建者用户 ID（外键关联 users 表）
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 使用 createSchemaFactory 配置 date coercion（处理前端 string → Date 转换）
const { createInsertSchema: createCoercedInsertSchema, createSelectSchema: createCoercedSelectSchema } = createSchemaFactory({
  coerce: { date: true },
})

// Zod schemas for validation
export const insertEventSchema = createCoercedInsertSchema(events)

// 单独覆盖 timestamp 字段，确保正确处理
export const insertEventWithCoercionSchema = createCoercedInsertSchema(events, {
  startTime: z.string().transform((val) => {
    const date = new Date(val)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${val}`)
    }
    return date
  }),
  endTime: z.string().transform((val) => {
    const date = new Date(val)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${val}`)
    }
    return date
  }),
  recurrenceEndDate: z.string().nullable().optional().transform((val) => {
    if (!val) return null
    const date = new Date(val)
    return isNaN(date.getTime()) ? null : date
  }),
})

// 更新 schema，处理时间字段转换
export const updateEventWithCoercionSchema = createCoercedInsertSchema(events, {
  startTime: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) return val
    const date = new Date(val)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${val}`)
    }
    return date
  }),
  endTime: z.union([z.string(), z.date()]).transform((val) => {
    if (val instanceof Date) return val
    const date = new Date(val)
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${val}`)
    }
    return date
  }),
  recurrenceEndDate: z.union([z.string().nullable(), z.date().nullable()]).nullable().optional().transform((val) => {
    if (!val) return null
    if (val instanceof Date) return val
    const date = new Date(val)
    return isNaN(date.getTime()) ? null : date
  }),
})
  .partial()
  .omit({ id: true, createdAt: true, updatedAt: true })

export const updateEventSchema = createCoercedInsertSchema(events)
  .partial()
  .omit({ id: true, createdAt: true, updatedAt: true })

// TypeScript types
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type InsertEvent = z.infer<typeof insertEventSchema>
export type UpdateEvent = z.infer<typeof updateEventSchema>
export type RecurrenceRule = typeof recurrenceRuleEnum.enumValues[number]
export type OrganizationType = typeof organizationTypeEnum.enumValues[number]

// User schemas and types
export const insertUserSchema = createCoercedInsertSchema(users)
export const selectUserSchema = createCoercedSelectSchema(users)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type InsertUser = z.infer<typeof insertUserSchema>

// 机构类型对应的颜色
export const ORGANIZATION_TYPE_COLORS = {
  center: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    calendarBg: "#3b82f6", // 蓝色系
  },
  club: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    calendarBg: "#22c55e", // 绿色系
  },
  other: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    calendarBg: "#a855f7", // 紫色系
  },
}

// 七大中心列表（蓝色系）
export const CENTERS = [
  "教科人管理中心",
  "科学研究中心",
  "产业发展中心",
  "智能创新中心",
  "行政管理中心",
  "党建思政与监督中心",
  "战略中心",
]

// 发起者选项列表（用于下拉选择）
export const ORGANIZER_OPTIONS = [
  ...CENTERS,
  "学生俱乐部",
  "其他",
]

// 根据发起者名称判断机构类型
export function getOrganizationType(organizer: string): "center" | "club" | "other" {
  if (CENTERS.includes(organizer)) {
    return "center"
  }
  if (organizer === "学生俱乐部") {
    return "club"
  }
  return "other"
}

// 根据发起者名称获取颜色
export function getOrganizerColor(organizer: string) {
  const type = getOrganizationType(organizer)
  return ORGANIZATION_TYPE_COLORS[type]
}
