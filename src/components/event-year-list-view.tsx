"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { CalendarEvent } from "@/types/calendar"
import { format, parseISO, startOfYear, endOfYear } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Calendar, Clock, MapPin } from "lucide-react"
import { getEventTypeColor } from "@/storage/database"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  formatDateByPrecision,
  getUncertainEventClassName,
} from "@/lib/date-precision-utils"
import { DatePrecision } from "@/storage/database/shared/schema"

interface EventYearListViewProps {
  onEventClick?: (event: CalendarEvent) => void
  onMonthClick?: (date: Date) => void
  eventTypeFilter?: string | string[]
  organizerFilter?: string | string[]
  tagsFilter?: string[]
  myEventsFilter?: boolean
  currentYear?: number
}

interface GroupedEvents {
  [month: string]: CalendarEvent[]
}

export function EventYearListView({
  onEventClick,
  onMonthClick,
  eventTypeFilter,
  organizerFilter,
  tagsFilter,
  myEventsFilter,
  currentYear = new Date().getFullYear(),
}: EventYearListViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const isMobile = useIsMobile()
  const monthGridRef = useRef<HTMLDivElement>(null)
  const hasScrolledToCurrentMonth = useRef(false)

  useEffect(() => {
    console.log("[EventYearListView] useIsMobile:", isMobile)
  }, [isMobile])

  // 获取整年的事件数据
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const yearStart = startOfYear(new Date(currentYear, 0, 1))
      const yearEnd = endOfYear(new Date(currentYear, 11, 31))

      params.append("startDate", yearStart.toISOString())
      params.append("endDate", yearEnd.toISOString())

      if (eventTypeFilter) {
        const eventTypeStr = Array.isArray(eventTypeFilter)
          ? eventTypeFilter.join(",")
          : eventTypeFilter
        params.append("eventType", eventTypeStr)
      }

      if (organizerFilter) {
        const organizerStr = Array.isArray(organizerFilter)
          ? organizerFilter.join(",")
          : organizerFilter
        params.append("organizer", organizerStr)
      }

      if (tagsFilter && tagsFilter.length > 0) {
        params.append("tags", tagsFilter.join(","))
      }

      if (myEventsFilter) params.append("myEvents", "true")

      const response = await fetch(`/api/events?${params.toString()}`)
      if (!response.ok) throw new Error("获取活动失败")

      const data = await response.json()

      // 按开始时间排序
      const sortedData = data.sort(
        (a: CalendarEvent, b: CalendarEvent) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
      )

      setEvents(sortedData)
    } catch (error) {
      console.error("获取活动失败:", error)
    } finally {
      setLoading(false)
    }
  }, [currentYear, eventTypeFilter, organizerFilter, tagsFilter, myEventsFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    hasScrolledToCurrentMonth.current = false
  }, [currentYear])

  // 生成所有12个月份
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i, 1)
    return format(date, "yyyy-MM")
  })

  // 按月份分组事件
  const groupedEvents = events.reduce((groups: GroupedEvents, event) => {
    const month = format(parseISO(event.start), "yyyy-MM")
    if (!groups[month]) {
      groups[month] = []
    }
    groups[month].push(event)
    return groups
  }, {})

  // 确保所有月份都有数组（即使没有事件）
  allMonths.forEach(month => {
    if (!groupedEvents[month]) {
      groupedEvents[month] = []
    }
  })

  // 在移动端自动滚动到当前月份卡片
  useEffect(() => {
    if (!isMobile || loading || hasScrolledToCurrentMonth.current) return

    const currentMonthCard = monthGridRef.current?.querySelector<HTMLElement>(
      '[data-current-month-card="true"]'
    )
    if (!currentMonthCard) return

    hasScrolledToCurrentMonth.current = true
    window.requestAnimationFrame(() => {
      currentMonthCard.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [isMobile, loading, currentYear])

  // 获取事件类型颜色
  const getEventColor = (event: CalendarEvent) => {
    const primaryEventType = event.extendedProps.eventType
      ? event.extendedProps.eventType.split(",")[0]?.trim()
      : null
    return getEventTypeColor(primaryEventType as any)
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </Card>
    )
  }

  const currentMonth = format(new Date(), "yyyy-MM")
  const isCurrentYear = currentYear === new Date().getFullYear()

  return (
    <Card className="p-4 md:p-6">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{currentYear}年活动列表</h2>
          <div className="text-sm text-muted-foreground">
            共 {events.length} 个活动
          </div>
        </div>

        {/* 月份卡片网格 - 每行2张卡片 */}
        <div ref={monthGridRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allMonths.map((month) => {
            const monthObj = parseISO(month + "-01")
            const eventsForMonth = groupedEvents[month]
            const isCurrentMonthCard = isCurrentYear && month === currentMonth

            // 检查是否为过去的月份
            const now = new Date()
            const currentMonthForCompare = format(now, "yyyy-MM")
            const isPastMonth = month < currentMonthForCompare

            return (
              <Card
                key={month}
                data-current-month-card={isCurrentMonthCard ? "true" : undefined}
                className={`p-4 hover:shadow-lg transition-shadow ${
                  isPastMonth ? "bg-muted/30" : ""
                }`}
              >
                {/* 月份标题 */}
                <div className="mb-3 pb-2 border-b">
                  <h3
                    className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => onMonthClick?.(monthObj)}
                  >
                    {format(monthObj, "yyyy年MM月", { locale: zhCN })}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {eventsForMonth.length} 个活动
                  </div>
                </div>

                {/* 该月份的活动列表 */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {eventsForMonth.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">暂无活动</p>
                    </div>
                  ) : (
                    eventsForMonth.map((event) => {
                      const color = getEventColor(event)
                      const startTime = parseISO(event.start)
                      const endTime = parseISO(event.end)
                      const datePrecision = (event.extendedProps?.datePrecision || "exact") as DatePrecision
                      const approximateMonth = event.extendedProps?.approximateMonth

                      // 格式化时间显示
                      let timeDisplay = ""
                      if (datePrecision === "exact") {
                        timeDisplay = `${format(startTime, "MM-dd HH:mm")}`
                      } else {
                        timeDisplay = formatDateByPrecision(startTime, datePrecision, approximateMonth)
                      }

                      return (
                        <div
                          key={event.id}
                          className={`p-2 cursor-pointer hover:bg-accent rounded-md transition-colors border-l-2 ${
                            datePrecision !== "exact" ? "opacity-75" : ""
                          }`}
                          style={{ borderLeftColor: color.calendarBg }}
                          onClick={() => onEventClick?.(event)}
                        >
                          <div className="flex items-start gap-2">
                            {/* 缩略图 */}
                            {event.extendedProps.imageUrl && (
                              <img
                                src={event.extendedProps.imageUrl}
                                alt={event.title}
                                className="w-12 h-12 object-cover rounded flex-shrink-0"
                              />
                            )}

                            {/* 活动信息 */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm mb-1 truncate">
                                {event.title}
                              </h4>

                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{timeDisplay}</span>
                              </div>

                              {datePrecision !== "exact" && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                                  📅 日期待定
                                </div>
                              )}

                              {event.extendedProps.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {event.extendedProps.location}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
