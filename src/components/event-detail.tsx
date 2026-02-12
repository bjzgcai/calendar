"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, User, Tag, ExternalLink, X, Trash2, AlertTriangle, Edit, Layers, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CalendarEvent } from "@/types/calendar"
import { getEventTypeColor } from "@/storage/database"

interface EventDetailProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventDeleted?: () => void
  onEventEdit?: (event: CalendarEvent) => void
}

export function EventDetail({ event, open, onOpenChange, onEventDeleted, onEventEdit }: EventDetailProps) {
  const [deleting, setDeleting] = useState(false)

  if (!event) return null

  // 检查必要的时间字段是否存在
  if (!event.start || !event.end) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const parseTags = (tags: string): string[] => {
    const matches = tags.match(/#[^#]+#/g)
    return matches || []
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("删除失败")

      onOpenChange(false)
      onEventDeleted?.()
    } catch (error) {
      console.error("删除活动失败:", error)
      alert("删除活动失败，请重试")
    } finally {
      setDeleting(false)
    }
  }

  const tags = parseTags(event.extendedProps.tags)

  // Parse comma-separated organizers and event types
  const organizers = event.extendedProps.organizer ? event.extendedProps.organizer.split(',').map(o => o.trim()) : []
  const eventTypes = event.extendedProps.eventType ? event.extendedProps.eventType.split(',').map(t => t.trim()).filter(t => t) : []

  // Check if event type exists
  const hasEventType = eventTypes.length > 0

  // Parse required attendees
  const parseRequiredAttendees = (requiredAttendeesStr?: string): Array<{userid: string, name: string}> => {
    if (!requiredAttendeesStr) return []
    try {
      const parsed = typeof requiredAttendeesStr === 'string'
        ? JSON.parse(requiredAttendeesStr)
        : requiredAttendeesStr
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const requiredAttendees = parseRequiredAttendees(event.extendedProps.requiredAttendees)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:h-8 [&>button]:w-8 [&>button>svg]:size-5">
        <DialogHeader>
          <DialogTitle className="text-2xl pr-8">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {event.extendedProps.imageUrl && (
            <a
              href="https://story.lab.bjzgca.edu.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="block relative w-full h-64 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              title="点击访问故事网站"
            >
              <img
                src={event.extendedProps.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </a>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.start).split(" ")[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {formatDate(event.start).split(" ").slice(1).join(" ")} -{" "}
                {formatDate(event.end).split(" ").slice(1).join(" ")}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {hasEventType && (
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">活动类型</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {eventTypes.map((type, index) => {
                      const colors = getEventTypeColor(type as any)
                      return (
                        <Badge key={index} className={colors.bg + " " + colors.text}>
                          {colors.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {organizers.length > 0 && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">发起者</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {organizers.map((org, index) => (
                      <Badge key={index} variant="outline">
                        {org}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {requiredAttendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">必须到的人</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {requiredAttendees.map((attendee, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {attendee.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {event.extendedProps.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">地点</p>
                  <p className="text-sm text-muted-foreground">{event.extendedProps.location}</p>
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">标签</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {event.extendedProps.content && (
            <div>
              <p className="font-medium mb-2">活动内容</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.extendedProps.content}</p>
            </div>
          )}

          {event.extendedProps.link && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="flex-1">
                <a href={event.extendedProps.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  访问链接
                </a>
              </Button>
            </div>
          )}

          <Separator />

          <div className="flex gap-2">
            <Button
              onClick={() => onEventEdit?.(event)}
              variant="outline"
              className="flex-1"
            >
              <Edit className="mr-2 h-4 w-4" />
              编辑活动
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? "删除中..." : "删除活动"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    确认删除
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    您确定要删除此活动吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
