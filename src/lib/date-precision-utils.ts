import { DatePrecision } from "@/storage/database/shared/schema"

/**
 * 根据日期精确度格式化显示文本
 */
export function formatDateByPrecision(
  date: Date | string,
  precision: DatePrecision,
  approximateMonth?: string | null
): string {
  if (precision === "month" && approximateMonth) {
    const [year, month] = approximateMonth.split("-")
    return `${year}年${parseInt(month)}月（日期待定）`
  }

  // 默认格式化精确日期
  const dateObj = typeof date === "string" ? new Date(date) : date
  return dateObj.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * 为"日期待定"的事件生成显示日期
 * 在月视图中显示在15号
 */
export function getDisplayDateForUncertainEvent(approximateMonth: string): {
  start: Date
  end: Date
} {
  const [year, month] = approximateMonth.split("-").map(Number)
  // 使用 UTC 时间避免时区偏移导致月份错位
  const start = new Date(Date.UTC(year, month - 1, 15, 0, 0, 0)) // 15号 00:00 UTC
  const end = new Date(Date.UTC(year, month - 1, 15, 23, 59, 59)) // 15号 23:59 UTC

  return { start, end }
}

/**
 * 检查事件是否应该在当前视图中显示
 */
export function shouldShowInView(
  precision: DatePrecision,
  viewType: string
): boolean {
  // 精确日期的事件在所有视图中显示
  if (precision === "exact") return true

  // 日期待定的事件显示规则
  if (precision === "month") {
    // 在月视图、年视图中显示
    if (viewType.includes("month") || viewType.includes("Year")) return true
    // 在周视图、日视图中不显示（避免混淆）
    return false
  }

  return true
}

/**
 * 为不确定日期的事件添加特殊类名
 */
export function getUncertainEventClassName(precision: DatePrecision): string {
  if (precision === "exact") return ""
  return `event-uncertain event-uncertain-${precision}`
}
