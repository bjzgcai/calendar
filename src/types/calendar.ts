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
    tags: string
    recurrenceRule?: string
    recurrenceEndDate?: string
  }
}
