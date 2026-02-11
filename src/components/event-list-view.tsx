"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { CalendarEvent } from "@/types/calendar"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, isSameDay } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Calendar, Clock, MapPin, Tag, Users, ExternalLink } from "lucide-react"
import { getEventTypeColor } from "@/storage/database"

interface EventListViewProps {
  onEventClick?: (event: CalendarEvent) => void
  eventTypeFilter?: string | string[]
  organizerFilter?: string | string[]
  tagsFilter?: string[]
  myEventsFilter?: boolean
}

interface GroupedEvents {
  [date: string]: CalendarEvent[]
}

export function EventListView({
  onEventClick,
  eventTypeFilter,
  organizerFilter,
  tagsFilter,
  myEventsFilter,
}: EventListViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [startMonth, setStartMonth] = useState(() => new Date()) // 从当前月份开始
  const [endMonth, setEndMonth] = useState(() => addMonths(new Date(), 3))
  const [hasMorePast, setHasMorePast] = useState(true)
  const [hasMoreFuture, setHasMoreFuture] = useState(true)

  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null) // 用于滚动到今天的位置
  const hasScrolledToToday = useRef(false) // 跟踪是否已经滚动到今天

  // 获取事件数据
  const fetchEvents = useCallback(
    async (start: Date, end: Date) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append("startDate", startOfMonth(start).toISOString())
        params.append("endDate", endOfMonth(end).toISOString())

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
        return data as CalendarEvent[]
      } catch (error) {
        console.error("获取活动失败:", error)
        return []
      } finally {
        setLoading(false)
      }
    },
    [eventTypeFilter, organizerFilter, tagsFilter, myEventsFilter]
  )

  // 当筛选器改变时，重置月份范围
  useEffect(() => {
    setStartMonth(new Date()) // 从当前月份开始
    setEndMonth(addMonths(new Date(), 3))
    setHasMorePast(true)
    setHasMoreFuture(true)
    hasScrolledToToday.current = false // 重置滚动标记
  }, [eventTypeFilter, organizerFilter, tagsFilter, myEventsFilter])

  // 初始加载
  useEffect(() => {
    const loadInitialEvents = async () => {
      const newEvents = await fetchEvents(startMonth, endMonth)
      setEvents(newEvents)
    }
    loadInitialEvents()
  }, [fetchEvents, startMonth, endMonth])

  // 自动滚动到今天的日期（仅初次加载时）
  useEffect(() => {
    if (events.length > 0 && todayRef.current && !hasScrolledToToday.current) {
      // 延迟一点确保 DOM 已经渲染
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        hasScrolledToToday.current = true
      }, 100)
    }
  }, [events])

  // 加载更早的事件（向上滚动）
  const loadPastEvents = useCallback(async () => {
    if (loading || !hasMorePast) return

    const newStartMonth = subMonths(startMonth, 3)
    const pastEvents = await fetchEvents(newStartMonth, subMonths(startMonth, 1))

    if (pastEvents.length === 0) {
      setHasMorePast(false)
    } else {
      setEvents((prev) => [...pastEvents, ...prev])
      setStartMonth(newStartMonth)
    }
  }, [loading, hasMorePast, startMonth, fetchEvents])

  // 加载更晚的事件（向下滚动）
  const loadFutureEvents = useCallback(async () => {
    if (loading || !hasMoreFuture) return

    const newEndMonth = addMonths(endMonth, 3)
    const futureEvents = await fetchEvents(addMonths(endMonth, 1), newEndMonth)

    if (futureEvents.length === 0) {
      setHasMoreFuture(false)
    } else {
      setEvents((prev) => [...prev, ...futureEvents])
      setEndMonth(newEndMonth)
    }
  }, [loading, hasMoreFuture, endMonth, fetchEvents])

  // 设置 IntersectionObserver 监听顶部和底部
  useEffect(() => {
    const topObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadPastEvents()
        }
      },
      { threshold: 0.1 }
    )

    const bottomObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadFutureEvents()
        }
      },
      { threshold: 0.1 }
    )

    if (topSentinelRef.current) {
      topObserver.observe(topSentinelRef.current)
    }
    if (bottomSentinelRef.current) {
      bottomObserver.observe(bottomSentinelRef.current)
    }

    return () => {
      topObserver.disconnect()
      bottomObserver.disconnect()
    }
  }, [loadPastEvents, loadFutureEvents])

  // 按日期分组事件
  const groupedEvents = events.reduce((groups: GroupedEvents, event) => {
    const date = format(parseISO(event.start), "yyyy-MM-dd")
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {})

  // 按日期排序
  const sortedDates = Object.keys(groupedEvents).sort()

  // 获取事件类型颜色
  const getEventColor = (event: CalendarEvent) => {
    const primaryEventType = event.extendedProps.eventType
      ? event.extendedProps.eventType.split(",")[0]?.trim()
      : null
    return getEventTypeColor(primaryEventType as any)
  }

  if (loading && events.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 flex flex-col h-[calc(100vh-12rem)] md:h-auto">
      <div
        ref={containerRef}
        className="space-y-6 flex-1 overflow-y-auto"
      >
        {/* 顶部哨兵 */}
        <div ref={topSentinelRef} className="h-4 flex items-center justify-center">
          {loading && hasMorePast && (
            <p className="text-sm text-muted-foreground">加载更早的事件...</p>
          )}
        </div>

        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4 opacity-50" />
            <p>没有找到活动</p>
          </div>
        ) : (
          sortedDates.map((date) => {
            const dateObj = parseISO(date)
            const eventsForDate = groupedEvents[date].sort(
              (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
            )

            const isToday = isSameDay(dateObj, new Date())

            return (
              <div
                key={date}
                className="space-y-3"
                ref={isToday ? todayRef : null}
              >
                {/* 日期标题 */}
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {format(dateObj, "yyyy年MM月dd日 EEEE", { locale: zhCN })}
                    {isToday && (
                      <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                        (今天)
                      </span>
                    )}
                  </h3>
                  <div className="h-px bg-border mt-2" />
                </div>

                {/* 该日期的所有事件 */}
                <div className="space-y-3">
                  {eventsForDate.map((event) => {
                    const color = getEventColor(event)
                    const startTime = parseISO(event.start)
                    const endTime = parseISO(event.end)

                    return (
                      <Card
                        key={event.id}
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                        style={{ borderLeftColor: color.calendarBg }}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="space-y-3">
                          {/* 标题和时间 */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-1">
                                {event.title}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(startTime, "HH:mm")} -{" "}
                                  {format(endTime, "HH:mm")}
                                </span>
                              </div>
                            </div>
                            {event.extendedProps.imageUrl && (
                              <img
                                src={event.extendedProps.imageUrl}
                                alt={event.title}
                                className="w-20 h-20 object-cover rounded"
                              />
                            )}
                          </div>

                          {/* 内容描述 */}
                          {event.extendedProps.content && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {event.extendedProps.content}
                            </p>
                          )}

                          {/* 详细信息 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {event.extendedProps.location && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {event.extendedProps.location}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">
                                {event.extendedProps.organizer}
                              </span>
                            </div>

                            {event.extendedProps.eventType && (
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 flex-shrink-0" />
                                <div className="flex flex-wrap gap-1">
                                  {event.extendedProps.eventType
                                    .split(",")
                                    .map((type, idx) => (
                                      <span
                                        key={idx}
                                        className="text-xs px-2 py-0.5 rounded-full"
                                        style={{
                                          backgroundColor: getEventTypeColor(
                                            type.trim() as any
                                          ).calendarBg,
                                          color: "white",
                                        }}
                                      >
                                        {type.trim()}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}

                            {event.extendedProps.link && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                <a
                                  href={event.extendedProps.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  查看详情
                                </a>
                              </div>
                            )}
                          </div>

                          {/* 标签 */}
                          {event.extendedProps.tags && (
                            <div className="flex flex-wrap gap-2">
                              {event.extendedProps.tags
                                .split(/[\s#]+/)
                                .filter(Boolean)
                                .map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* 底部哨兵 */}
        <div ref={bottomSentinelRef} className="h-4 flex items-center justify-center">
          {loading && hasMoreFuture && (
            <p className="text-sm text-muted-foreground">加载更多事件...</p>
          )}
        </div>
      </div>
    </Card>
  )
}
