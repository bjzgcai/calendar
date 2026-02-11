"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar as CalendarIcon, List } from "lucide-react"
import { EventCalendar } from "@/components/event-calendar"
import { EventListView } from "@/components/event-list-view"
import { EventYearListView } from "@/components/event-year-list-view"
import { EventDetail } from "@/components/event-detail"
import { EventForm } from "@/components/event-form"
import { EventFilter } from "@/components/event-filter"
import { UserMenu } from "@/components/user-menu"
import { CalendarEvent } from "@/types/calendar"
import { Button } from "@/components/ui/button"

type ViewMode = "year" | "month" | "week" | "day" | "list"

export function CalendarPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 从 URL 读取初始视图模式
  const initialViewMode = (searchParams.get("view") as ViewMode) || "week"

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [initialFormValues, setInitialFormValues] = useState<any>(undefined)
  const [eventTypeFilter, setEventTypeFilter] = useState<string | string[] | undefined>()
  const [organizerFilter, setOrganizerFilter] = useState<string | string[] | undefined>()
  const [tagsFilter, setTagsFilter] = useState<string[]>([])
  const [myEventsFilter, setMyEventsFilter] = useState<boolean>(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)

  // 同步 viewMode 到 URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", viewMode)
    router.push(`?${params.toString()}`, { scroll: false })
  }, [viewMode, router])

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }

  const handleTimeSlotSelect = (start: Date, end: Date) => {
    // 将时间转换为表单所需的格式
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }

    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = Math.floor(date.getMinutes() / 15) * 15 // 四舍五入到15分钟
      const roundedMinutes = minutes.toString().padStart(2, '0')
      return `${hours}:${roundedMinutes}`
    }

    setInitialFormValues({
      date: formatDate(start),
      startHour: formatTime(start),
      endHour: formatTime(end),
    })
    setFormOpen(true)
  }

  const handleEventDeleted = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleEventEdit = (event: CalendarEvent) => {
    console.log("=== 开始编辑活动 ===")
    console.log("活动数据:", event)

    // 将活动数据转换为表单所需的格式
    const startDate = new Date(event.start)
    const endDate = new Date(event.end)

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }

    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = Math.floor(date.getMinutes() / 15) * 15
      const roundedMinutes = minutes.toString().padStart(2, '0')
      return `${hours}:${roundedMinutes}`
    }

    const initialValues = {
      id: Number(event.id),
      title: event.title,
      content: event.extendedProps.content,
      datePrecision: event.extendedProps.datePrecision || "exact",
      approximateMonth: event.extendedProps.approximateMonth || "",
      date: formatDate(startDate),
      startHour: formatTime(startDate),
      endHour: formatTime(endDate),
      location: event.extendedProps.location || "",
      organizer: event.extendedProps.organizer,
      eventType: event.extendedProps.eventType,
      tags: event.extendedProps.tags || "",
      imageUrl: event.extendedProps.imageUrl || "",
      link: event.extendedProps.link || "",
      recurrenceRule: event.extendedProps.recurrenceRule || "none",
      recurrenceEndDate: event.extendedProps.recurrenceEndDate
        ? formatDate(new Date(event.extendedProps.recurrenceEndDate))
        : "",
    }

    console.log("表单初始值:", initialValues)
    setInitialFormValues(initialValues)
    setDetailOpen(false)
    setFormOpen(true)
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleFormSuccess = () => {
    console.log("=== 表单成功回调触发 ===")
    console.log("关闭表单，刷新日历...")
    setFormOpen(false)
    setInitialFormValues(undefined)
    handleRefresh()
    console.log("=== 表单成功回调完成 ===")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
                学院活动日历
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                查看学院内所有活动，及时了解最新动态
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 视图切换按钮 */}
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                <Button
                  variant={viewMode === "year" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("year")}
                  className="h-8"
                >
                  年
                </Button>
                <Button
                  variant={viewMode === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                  className="h-8"
                >
                  月
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                  className="h-8"
                >
                  周
                </Button>
                <Button
                  variant={viewMode === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                  className="h-8"
                >
                  日
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8"
                >
                  <List className="h-4 w-4 mr-1" />
                  列表
                </Button>
              </div>

              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                创建活动
              </button>
              <UserMenu />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <EventFilter
              key={refreshKey}
              onEventTypeChange={setEventTypeFilter}
              onOrganizerChange={setOrganizerFilter}
              onTagsChange={setTagsFilter}
              onMyEventsChange={setMyEventsFilter}
            />
          </div>

          {/* Calendar or List View */}
          <div className="lg:col-span-3 min-h-0">
            {viewMode === "list" ? (
              <EventListView
                key={refreshKey}
                onEventClick={handleEventClick}
                eventTypeFilter={eventTypeFilter}
                organizerFilter={organizerFilter}
                tagsFilter={tagsFilter}
                myEventsFilter={myEventsFilter}
              />
            ) : viewMode === "year" ? (
              <EventYearListView
                key={refreshKey}
                onEventClick={handleEventClick}
                eventTypeFilter={eventTypeFilter}
                organizerFilter={organizerFilter}
                tagsFilter={tagsFilter}
                myEventsFilter={myEventsFilter}
              />
            ) : (
              <EventCalendar
                key={`${refreshKey}-${viewMode}`}
                onEventClick={handleEventClick}
                onTimeSlotSelect={handleTimeSlotSelect}
                currentView={
                  viewMode === "month"
                    ? "dayGridMonth"
                    : viewMode === "week"
                    ? "timeGridWeek"
                    : "timeGridDay"
                }
                eventTypeFilter={eventTypeFilter}
                organizerFilter={organizerFilter}
                tagsFilter={tagsFilter}
                myEventsFilter={myEventsFilter}
              />
            )}
          </div>
        </div>

        {/* Event Detail Dialog */}
        <EventDetail
          event={selectedEvent}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEventDeleted={handleEventDeleted}
          onEventEdit={handleEventEdit}
        />

        {/* Event Form Dialog */}
        <EventForm
          open={formOpen}
          onOpenChange={setFormOpen}
          initialValues={initialFormValues}
          onSuccess={handleFormSuccess}
        />
      </div>
    </div>
  )
}
