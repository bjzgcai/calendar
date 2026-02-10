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
  }
}
