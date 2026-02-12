import { pgTable, serial, varchar, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"

// 日期精确度枚举
export const datePrecisionEnum = pgEnum("date_precision", [
  "exact",      // 精确日期时间
  "month",      // 仅知道月份
])

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

// 活动性质枚举
export const eventTypeEnum = pgEnum("event_type", [
  "academic_research",      // 学术研究
  "teaching_training",      // 教学培训
  "student_activities",     // 学生活动
  "industry_academia",      // 产学研合作
  "administration",         // 行政管理
  "important_deadlines",    // 重要节点
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
  content: text("content"),
  imageUrl: text("image_url"),
  link: text("link"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  location: varchar("location", { length: 255 }),
  organizer: text("organizer"), // Changed to text to store comma-separated values
  organizationType: organizationTypeEnum("organization_type"),
  eventType: text("event_type"), // Changed to text to store comma-separated values
  tags: text("tags").notNull().default(""),
  recurrenceRule: recurrenceRuleEnum("recurrence_rule").notNull().default("none"),
  recurrenceEndDate: timestamp("recurrence_end_date", { withTimezone: true }),
  datePrecision: datePrecisionEnum("date_precision").notNull().default("exact"), // 日期精确度
  approximateMonth: varchar("approximate_month", { length: 7 }), // YYYY-MM 格式，用于存储月份待定的事件
  requiredAttendees: text("required_attendees"), // 必须到场的人（JSON数组：[{userid, name}]）
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
export type EventType = "academic_research" | "teaching_training" | "student_activities" | "industry_academia" | "administration" | "important_deadlines"
export type DatePrecision = typeof datePrecisionEnum.enumValues[number]

// Helper functions for array field handling
export function organziersToString(organizers: string[]): string {
  return organizers.join(",")
}

export function stringToOrganizers(str: string): string[] {
  return str ? str.split(",").filter(s => s.trim()) : []
}

export function eventTypesToString(types: EventType[]): string {
  return types.join(",")
}

export function stringToEventTypes(str: string | null): EventType[] {
  if (!str) return []
  return str.split(",").filter(s => s.trim()) as EventType[]
}

// Required Attendees 类型定义
export type RequiredAttendee = {
  userid: string
  name: string
}

// 将 Required Attendees 数组转换为 JSON 字符串
export function requiredAttendeesToString(attendees: RequiredAttendee[]): string {
  return JSON.stringify(attendees)
}

// 将 JSON 字符串转换为 Required Attendees 数组
export function stringToRequiredAttendees(str: string | null): RequiredAttendee[] {
  if (!str) return []
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// User schemas and types
export const insertUserSchema = createCoercedInsertSchema(users)
export const selectUserSchema = createCoercedSelectSchema(users)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type InsertUser = z.infer<typeof insertUserSchema>

// 活动性质对应的颜色
export const EVENT_TYPE_COLORS = {
  academic_research: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    calendarBg: "#3b82f6", // 蓝色
    label: "学术研究",
    description: "科研项目、学术讲座、研讨会、论文答辩等学术活动",
  },
  teaching_training: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    calendarBg: "#22c55e", // 绿色
    label: "教学培训",
    description: "课程培训、技能工作坊、教学活动、在线课程等",
  },
  student_activities: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    calendarBg: "#f59e0b", // 橙黄色
    label: "学生活动",
    description: "社团活动、文体比赛、学生聚会、校园文化活动等",
  },
  industry_academia: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    calendarBg: "#a855f7", // 紫色
    label: "产学研合作",
    description: "企业合作项目、实习宣讲、产业对接、校企联合活动等",
  },
  administration: {
    bg: "bg-gray-100 dark:bg-gray-900/30",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-800",
    calendarBg: "#6b7280", // 灰色
    label: "行政管理",
    description: "部门会议、行政通知、制度培训、管理例会等",
  },
  important_deadlines: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    calendarBg: "#ef4444", // 红色
    label: "重要节点",
    description: "项目截止、报名截止、材料提交、重要节点提醒等",
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

// 根据活动性质获取颜色
export function getEventTypeColor(eventType: EventType | null | undefined) {
  if (!eventType) {
    return EVENT_TYPE_COLORS.student_activities // 默认使用学生活动颜色
  }
  return EVENT_TYPE_COLORS[eventType]
}

// 根据发起者名称判断机构类型
export function getOrganizationType(organizer: string): OrganizationType {
  if (CENTERS.includes(organizer)) {
    return "center"
  }
  if (organizer === "学生俱乐部") {
    return "club"
  }
  return "other"
}
