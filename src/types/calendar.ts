export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  extendedProps: {
    content: string
    imageUrl?: string
    link?: string
    location?: string
    organizer: string
    organizationType: string
    eventType?: string // 活动性质（用于颜色标识）
    tags: string
    recurrenceRule?: string
    recurrenceEndDate?: string
    datePrecision?: "exact" | "month" // 日期精确度
    approximateMonth?: string // 近似月份（YYYY-MM）
  }
}
