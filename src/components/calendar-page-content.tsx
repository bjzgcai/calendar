"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { List, RefreshCw, Info } from "lucide-react"
import Image from "next/image"
import { EventCalendar } from "@/components/event-calendar"
import { EventListView } from "@/components/event-list-view"
import { EventYearListView } from "@/components/event-year-list-view"
import { EventDetail } from "@/components/event-detail"
import { EventForm } from "@/components/event-form"
import { BatchCreateEventsDialog } from "@/components/batch-create-events-dialog"
import { EventFilter } from "@/components/event-filter"
import { UserMenu } from "@/components/user-menu"
import { CalendarEvent } from "@/types/calendar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { SYNC_USER_NAMES } from "@/lib/sync-config"
import { useAuth } from "@/contexts/auth-context"

type ViewMode = "year" | "month" | "week" | "day" | "list"

export function CalendarPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, ssoEnabled, login } = useAuth()
  const canEdit = !ssoEnabled || !!user

  // 从 URL 读取初始视图模式和日期
  const initialViewMode = (searchParams.get("view") as ViewMode) || "year"
  const initialDate = searchParams.get("date")
    ? new Date(searchParams.get("date")!)
    : undefined

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [batchFormOpen, setBatchFormOpen] = useState(false)
  const [initialFormValues, setInitialFormValues] = useState<any>(undefined)
  const [eventTypeFilter, setEventTypeFilter] = useState<string | string[] | undefined>()
  const [organizerFilter, setOrganizerFilter] = useState<string | string[] | undefined>()
  const [tagsFilter, setTagsFilter] = useState<string[]>([])
  const [myEventsFilter, setMyEventsFilter] = useState<boolean>(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate)
  const [calendarViewDates, setCalendarViewDates] = useState<{ start: Date; end: Date } | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  // 同步 viewMode 到 URL
  useEffect(() => {
    const currentView = searchParams.get("view")
    const currentDate = searchParams.get("date")

    // Only update URL if something actually changed
    if (currentView === viewMode &&
        (selectedDate ? currentDate === selectedDate.toISOString() : !currentDate)) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("view", viewMode)

    // Only keep date parameter if it exists
    if (!selectedDate && params.has("date")) {
      params.delete("date")
    } else if (selectedDate) {
      params.set("date", selectedDate.toISOString())
    }

    router.push(`?${params.toString()}`, { scroll: false })
  }, [viewMode, selectedDate])

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }

  const handleTimeSlotSelect = (start: Date, end: Date) => {
    if (!canEdit) return
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
      requiredAttendees: event.extendedProps.requiredAttendees,
    }

    console.log("表单初始值:", initialValues)
    setInitialFormValues(initialValues)
    setDetailOpen(false)
    setFormOpen(true)
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleViewDatesChange = (start: Date, end: Date) => {
    setCalendarViewDates({ start, end })
  }

  // Compute poster date range from the current view
  const posterViewDateRange = (() => {
    const base = selectedDate ?? new Date()
    if (viewMode === "year") {
      const year = base.getFullYear()
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) }
    }
    if (viewMode === "list") {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 30)
      return { start, end }
    }
    // month / week / day — prefer FullCalendar's reported range
    if (calendarViewDates) return calendarViewDates
    // Fallback: compute from viewMode + base date (before datesSet fires)
    if (viewMode === "month") {
      return {
        start: new Date(base.getFullYear(), base.getMonth(), 1),
        end: new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59),
      }
    }
    if (viewMode === "week") {
      const day = base.getDay() // 0=Sun
      const weekStart = new Date(base)
      weekStart.setDate(base.getDate() - day)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      return { start: weekStart, end: weekEnd }
    }
    // day view
    const start = new Date(base)
    start.setHours(0, 0, 0, 0)
    const end = new Date(base)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  })()

  // DingTalk calendar sync
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // manual=true: triggered by button click, refreshes UI on changes
  // manual=false: background sync, never refreshes UI
  const runSync = async (manual = false) => {
    setSyncStatus("syncing")
    try {
      const res = await fetch("/api/dingtalk/sync", { method: "POST" })
      const data = await res.json()
      if (manual && (data.summary?.created > 0 || data.summary?.updated > 0 || data.summary?.deleted > 0)) {
        handleRefresh()
      }
      setLastSyncTime(new Date())
      setSyncStatus("idle")
    } catch {
      setSyncStatus("error")
    }
  }

  useEffect(() => {
    // Initial background sync on mount, then every 30 minutes — never refreshes UI
    runSync(false)
    syncIntervalRef.current = setInterval(() => runSync(false), 30 * 60 * 1000)
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [])

  const handleFormSuccess = () => {
    console.log("=== 表单成功回调触发 ===")
    console.log("关闭表单，刷新日历...")
    setFormOpen(false)
    setInitialFormValues(undefined)
    handleRefresh()
    console.log("=== 表单成功回调完成 ===")
  }

  const handleMonthClick = (date: Date) => {
    setSelectedDate(date)
    setViewMode("month")

    // Update URL with the selected month
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", "month")
    params.set("date", date.toISOString())
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Image src="/icon.svg" alt="Calendar Icon" width={32} height={32} className="h-8 w-8" />
                学院活动日历
              </h1>
              {/* <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                内测版, 仅限学院内网访问
              </p> */}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* 视图切换按钮 */}
              <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                <Button
                  variant={viewMode === "year" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setViewMode("year")
                    setSelectedDate(undefined)
                  }}
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
                  onClick={() => {
                    setViewMode("list")
                    setSelectedDate(undefined)
                  }}
                  className="h-8"
                >
                  <List className="h-4 w-4 mr-1" />
                  列表
                </Button>
              </div>

              {canEdit && (
                <button
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                  <Image src="/icon.svg" alt="Calendar Icon" width={16} height={16} className="mr-2 h-4 w-4" />
                  创建活动
                </button>
              )}
              {canEdit ? (
                <button
                  onClick={() => setBatchFormOpen(true)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                >
                  批量创建
                </button>
              ) : ssoEnabled && !user && (
                <button
                  onClick={login}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border border-primary text-primary hover:bg-primary/10 h-9 px-4 py-2"
                >
                  点击登录，创建编辑活动
                </button>
              )}
              {/* DingTalk sync status indicator */}
              <button
                onClick={() => runSync(true)}
                disabled={syncStatus === "syncing"}
                title={lastSyncTime ? `上次同步: ${lastSyncTime.toLocaleTimeString()}` : "同步钉钉日历"}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""} ${syncStatus === "error" ? "text-red-500" : ""}`} />
                <span className="hidden sm:inline">
                  {syncStatus === "syncing" ? "同步中…" : syncStatus === "error" ? "同步失败" : "钉钉同步"}
                </span>
              </button>
              {/* Info icon: who can edit and auto-sync */}
              <Tooltip open={infoOpen} onOpenChange={setInfoOpen}>
                <TooltipTrigger asChild>
                  <button
                    className="inline-flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setInfoOpen((v) => !v)}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-72">
                  <p className="font-medium mb-1">每小时整点(也可以点击同步按钮手动刷新),自动同步这些负责人所创建的公共活动（人数大于50）：</p>
                  <p className="leading-relaxed">{Object.values(SYNC_USER_NAMES).join("、")}</p>
                </TooltipContent>
              </Tooltip>
              {/* Mobile filter button - inline in header */}
              <div className="lg:hidden">
                <EventFilter
                  key={refreshKey}
                  onEventTypeChange={setEventTypeFilter}
                  onOrganizerChange={setOrganizerFilter}
                  onTagsChange={setTagsFilter}
                  onMyEventsChange={setMyEventsFilter}
                  viewStartDate={posterViewDateRange?.start}
                  viewEndDate={posterViewDateRange?.end}
                />
              </div>
              <UserMenu />
            </div>
          </div>
        </div>

        <div className="lg:grid lg:gap-6 lg:grid-cols-4">
          {/* Filter Sidebar - desktop only */}
          <div className="hidden lg:block lg:col-span-1">
            <EventFilter
              key={refreshKey}
              onEventTypeChange={setEventTypeFilter}
              onOrganizerChange={setOrganizerFilter}
              onTagsChange={setTagsFilter}
              onMyEventsChange={setMyEventsFilter}
              viewStartDate={posterViewDateRange?.start}
              viewEndDate={posterViewDateRange?.end}
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
                onMonthClick={handleMonthClick}
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
                onViewDatesChange={handleViewDatesChange}
                currentView={
                  viewMode === "month"
                    ? "dayGridMonth"
                    : viewMode === "week"
                    ? "timeGridWeek"
                    : "timeGridDay"
                }
                initialDate={selectedDate}
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

        <BatchCreateEventsDialog
          open={batchFormOpen}
          onOpenChange={setBatchFormOpen}
          onSuccess={handleRefresh}
        />
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-600">
        © 中关村学院
        {process.env.NEXT_PUBLIC_BUILD_TIME && (
          <span className="ml-2">· 版本时间 {process.env.NEXT_PUBLIC_BUILD_TIME}</span>
        )}
      </div>
    </div>
  )
}
