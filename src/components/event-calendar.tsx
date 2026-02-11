"use client"

import { useState, useEffect, useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import multiMonthPlugin from "@fullcalendar/multimonth"
import tippy from "tippy.js"
import "tippy.js/dist/tippy.css"
import "./event-calendar.css"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { CalendarEvent } from "@/types/calendar"
import { getHolidayInfo } from "@/lib/chinese-holidays"
import {
  formatDateByPrecision,
  getDisplayDateForUncertainEvent,
  getUncertainEventClassName,
} from "@/lib/date-precision-utils"
import { DatePrecision } from "@/storage/database/shared/schema"

interface EventCalendarProps {
  onEventClick?: (event: CalendarEvent) => void
  onTimeSlotSelect?: (start: Date, end: Date) => void
  onViewChange?: (view: string) => void
  currentView?: string
  eventTypeFilter?: string | string[]
  organizerFilter?: string | string[]
  tagsFilter?: string[]
  myEventsFilter?: boolean
}

export function EventCalendar({ onEventClick, onTimeSlotSelect, onViewChange, currentView, eventTypeFilter, organizerFilter, tagsFilter, myEventsFilter }: EventCalendarProps) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // PC端默认周视图，Mobile端默认日视图
  const defaultView = isDesktop ? "timeGridWeek" : "timeGridDay"
  const initialView = currentView || defaultView

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      // Convert array to comma-separated string for API
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
        // Join multiple tags with comma for AND filtering
        params.append("tags", tagsFilter.join(","))
      }

      if (myEventsFilter) params.append("myEvents", "true")

      const response = await fetch(`/api/events?${params.toString()}`)
      if (!response.ok) throw new Error("获取活动失败")

      const data = await response.json()

      // 处理不确定日期的事件
      const processedEvents = data.map((event: any) => {
        const datePrecision = event.datePrecision || "exact"

        // 如果是日期待定的事件，将其显示在月初
        if (datePrecision === "month" && event.approximateMonth) {
          const { start, end } = getDisplayDateForUncertainEvent(event.approximateMonth)
          return {
            ...event,
            start: start.toISOString(),
            end: end.toISOString(),
            className: getUncertainEventClassName(datePrecision),
            extendedProps: {
              ...event.extendedProps,
              datePrecision,
              approximateMonth: event.approximateMonth,
            },
          }
        }

        return {
          ...event,
          className: getUncertainEventClassName(datePrecision),
          extendedProps: {
            ...event.extendedProps,
            datePrecision,
            approximateMonth: event.approximateMonth,
          },
        }
      })

      setEvents(processedEvents)
    } catch (error) {
      console.error("获取活动失败:", error)
    } finally {
      setLoading(false)
    }
  }, [eventTypeFilter, organizerFilter, tagsFilter, myEventsFilter])

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
        eventType: event.extendedProps.eventType,
        tags: event.extendedProps.tags,
        recurrenceRule: event.extendedProps.recurrenceRule,
        datePrecision: event.extendedProps.datePrecision,
        approximateMonth: event.extendedProps.approximateMonth,
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

  const handleDateClick = (info: any) => {
    const clickedDate = info.date as Date

    // 为月视图创建一个默认的时间段（例如：9:00 - 10:00）
    const start = new Date(clickedDate)
    start.setHours(9, 0, 0, 0)

    const end = new Date(clickedDate)
    end.setHours(10, 0, 0, 0)

    onTimeSlotSelect?.(start, end)
  }

  const handleViewChange = (info: any) => {
    onViewChange?.(info.view.type)
  }

  const handleEventDidMount = (info: any) => {
    const event = info.event
    const startTime = event.start
    const endTime = event.end

    // 检查时间是否有效
    if (!startTime || !endTime) {
      return
    }

    const datePrecision = (event.extendedProps?.datePrecision || "exact") as DatePrecision
    const approximateMonth = event.extendedProps?.approximateMonth

    // 格式化时间显示
    let timeStr = ""
    if (datePrecision === "exact") {
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      }
      timeStr = `${formatTime(startTime)} - ${formatTime(endTime)}`
    } else {
      timeStr = formatDateByPrecision(startTime, datePrecision, approximateMonth)
    }

    const imageUrl = event.extendedProps?.imageUrl
    const content = event.extendedProps?.content || ""

    // 为不确定日期的事件添加特殊标识
    const uncertainBadge =
      datePrecision !== "exact"
        ? `<div class="event-uncertain-badge">📅 日期待定</div>`
        : ""

    // 创建富文本提示内容
    const tooltipContent = `
      <div style="max-width: 280px;">
        ${uncertainBadge}
        <div class="event-tooltip-title">
          ${event.title}
        </div>
        <div class="event-tooltip-time">
          ${timeStr}
        </div>
        ${
          content
            ? `<div class="event-tooltip-content">
                ${content}
              </div>`
            : ""
        }
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
      interactive: true, // Allow hovering over tooltip
      interactiveBorder: 10, // Add invisible bridge area to prevent gap issues
      offset: [0, 5], // Reduce gap between event and tooltip
      delay: [0, 100], // Small delay before hiding
      appendTo: () => document.body,
    })
  }

  const handleDayCellDidMount = (info: any) => {
    const date = info.date
    const holidayInfo = getHolidayInfo(date)

    if (!holidayInfo) return

    // 在日期单元格添加节假日标记
    const dayNumberEl = info.el.querySelector('.fc-daygrid-day-number, .fc-col-header-cell-cushion')
    if (!dayNumberEl) return

    // 创建节假日标记元素
    const badge = document.createElement('span')
    badge.className = holidayInfo.isHoliday ? 'holiday-badge' : 'workday-badge'
    badge.textContent = holidayInfo.isHoliday ? '休' : '班'
    badge.title = holidayInfo.name

    // 将标记插入到日期数字旁边
    if (dayNumberEl.parentNode) {
      const wrapper = document.createElement('div')
      wrapper.className = 'day-number-wrapper'
      dayNumberEl.parentNode.insertBefore(wrapper, dayNumberEl)
      wrapper.appendChild(dayNumberEl)
      wrapper.appendChild(badge)
    }

    // 为节假日单元格添加背景色
    if (holidayInfo.isHoliday) {
      info.el.classList.add('holiday-cell')
    } else {
      info.el.classList.add('workday-cell')
    }
  }

  const handleMoreLinkDidMount = (info: any) => {
    const moreLinkEl = info.el
    let hideTimeout: NodeJS.Timeout | null = null

    const isPopoverVisible = () => {
      const popover = document.querySelector('.fc-popover')
      return popover !== null
    }

    const closePopover = () => {
      const popover = document.querySelector('.fc-popover')
      if (popover) {
        const closeButton = popover.querySelector('.fc-popover-close') as HTMLElement
        if (closeButton) {
          closeButton.click()
        }
      }
    }

    const scheduleHidePopover = () => {
      hideTimeout = setTimeout(() => {
        closePopover()
      }, 500)
    }

    const cancelHidePopover = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }
    }

    const setupPopoverListeners = (popover: Element) => {
      if (popover.hasAttribute('data-hover-enabled')) return

      popover.setAttribute('data-hover-enabled', 'true')

      // 鼠标进入 popover 时取消关闭
      popover.addEventListener('mouseenter', cancelHidePopover)

      // 鼠标离开 popover 时关闭
      popover.addEventListener('mouseleave', scheduleHidePopover)
    }

    const showPopover = () => {
      cancelHidePopover()

      // 检查 popover 是否已经存在
      if (!isPopoverVisible()) {
        // 触发 FullCalendar 的内置 popover
        moreLinkEl.click()

        // 立即查找并设置 popover 监听器
        setTimeout(() => {
          const popover = document.querySelector('.fc-popover')
          if (popover) {
            setupPopoverListeners(popover)
          }
        }, 10)
      }
    }

    // 鼠标进入 "+X more" 链接时显示 popover
    moreLinkEl.addEventListener('mouseenter', showPopover)

    // 鼠标离开时延迟关闭
    moreLinkEl.addEventListener('mouseleave', () => {
      // 给一些时间让鼠标移动到 popover
      setTimeout(() => {
        // 检查鼠标是否在 popover 上
        const popover = document.querySelector('.fc-popover')
        if (popover && popover.matches(':hover')) {
          // 鼠标在 popover 上，不关闭
          return
        }
        // 鼠标不在 popover 上，延迟关闭
        scheduleHidePopover()
      }, 100)
    })

    // 监听 popover 的挂载作为备用方案
    const observer = new MutationObserver(() => {
      const popover = document.querySelector('.fc-popover')
      if (popover && !popover.hasAttribute('data-hover-enabled')) {
        setupPopoverListeners(popover)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // 清理函数
    return () => {
      observer.disconnect()
      cancelHidePopover()
    }
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
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin]}
        initialView={initialView}
        timeZone="local"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        events={events}
        eventClick={handleEventClick}
        eventDidMount={handleEventDidMount}
        dayCellDidMount={handleDayCellDidMount}
        moreLinkDidMount={handleMoreLinkDidMount}
        select={handleSelect}
        selectAllow={handleSelectAllow}
        dateClick={handleDateClick}
        viewDidMount={handleViewChange}
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
          multiMonthYear: "年",
        }}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="24:00:00"
        dayHeaderFormat={{
          weekday: "short",
        }}
        titleFormat={{
          month: "long",
          year: "numeric",
        }}
        dayMaxEvents={true}
      />
    </Card>
  )
}
