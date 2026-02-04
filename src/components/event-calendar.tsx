"use client"

import { useState, useEffect, useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import tippy from "tippy.js"
import "tippy.js/dist/tippy.css"
import "./event-calendar.css"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { CalendarEvent } from "@/types/calendar"

interface EventCalendarProps {
  onEventClick?: (event: CalendarEvent) => void
  onTimeSlotSelect?: (start: Date, end: Date) => void
  organizerFilter?: string
  tagsFilter?: string[]
  myEventsFilter?: boolean
}

export function EventCalendar({ onEventClick, onTimeSlotSelect, organizerFilter, tagsFilter, myEventsFilter }: EventCalendarProps) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // PC端默认周视图，Mobile端默认日视图
  const [initialView, setInitialView] = useState(isDesktop ? "timeGridWeek" : "timeGridDay")

  useEffect(() => {
    setInitialView(isDesktop ? "timeGridWeek" : "timeGridDay")
  }, [isDesktop])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (organizerFilter) params.append("organizer", organizerFilter)
      if (tagsFilter && tagsFilter.length > 0) {
        // Join multiple tags with comma for AND filtering
        params.append("tags", tagsFilter.join(","))
      }
      if (myEventsFilter) params.append("myEvents", "true")

      const response = await fetch(`/api/events?${params.toString()}`)
      if (!response.ok) throw new Error("获取活动失败")

      const data = await response.json()
      setEvents(data)
    } catch (error) {
      console.error("获取活动失败:", error)
    } finally {
      setLoading(false)
    }
  }, [organizerFilter, tagsFilter, myEventsFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleEventClick = (info: any) => {
    const event = info.event
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.start?.toISOString() || "",
      end: event.end?.toISOString() || "",
      extendedProps: {
        content: event.extendedProps.content,
        imageUrl: event.extendedProps.imageUrl,
        link: event.extendedProps.link,
        location: event.extendedProps.location,
        organizer: event.extendedProps.organizer,
        organizationType: event.extendedProps.organizationType || "other",
        tags: event.extendedProps.tags,
        recurrenceRule: event.extendedProps.recurrenceRule,
      },
    }
    onEventClick?.(calendarEvent)
  }

  const handleSelectAllow = (selectInfo: any) => {
    const start = selectInfo.start as Date
    const end = selectInfo.end as Date

    // 检查是否跨天（比较日期部分）
    const startDay = start.toDateString()
    const endDay = end.toDateString()

    // 如果跨天，不允许选择并返回 false
    return startDay === endDay
  }

  const handleSelect = (info: any) => {
    const start = info.start as Date
    const end = info.end as Date

    if (start && end) {
      onTimeSlotSelect?.(start, end)
    }

    // 清除选择
    info.view.calendar.unselect()
  }

  const handleEventDidMount = (info: any) => {
    const event = info.event
    const startTime = event.start
    const endTime = event.end

    // 检查时间是否有效
    if (!startTime || !endTime) {
      return
    }

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    const timeStr = `${formatTime(startTime)} - ${formatTime(endTime)}`
    const imageUrl = event.extendedProps?.imageUrl

    // 创建富文本提示内容
    const tooltipContent = `
      <div style="max-width: 280px;">
        <div class="event-tooltip-title">
          ${event.title}
        </div>
        <div class="event-tooltip-time">
          ${timeStr}
        </div>
        ${
          imageUrl
            ? `<img
                src="${imageUrl}"
                alt="${event.title}"
                class="event-tooltip-image"
              />`
            : ""
        }
      </div>
    `

    // 使用 tippy.js 创建富文本提示
    tippy(info.el, {
      content: tooltipContent,
      allowHTML: true,
      theme: "event-tooltip",
      placement: "top",
      arrow: true,
      interactive: false,
      appendTo: () => document.body,
    })
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

  return (
    <Card className="p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={initialView}
        timeZone="local"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        events={events}
        eventClick={handleEventClick}
        eventDidMount={handleEventDidMount}
        select={handleSelect}
        selectAllow={handleSelectAllow}
        editable={false}
        selectable={true}
        height="auto"
        locale="zh-cn"
        buttonText={{
          today: "今天",
          month: "月",
          week: "周",
          day: "日",
          list: "列表",
        }}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="26:00:00"
        dayHeaderFormat={{
          weekday: "short",
        }}
        titleFormat={{
          month: "long",
          year: "numeric",
        }}
      />
    </Card>
  )
}
