"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, User, Tag, ExternalLink, X, Trash2, AlertTriangle, Edit } from "lucide-react"
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

// 机构类型对应的颜色
const ORGANIZATION_TYPE_COLORS = {
  center: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    calendarBg: "#3b82f6", // 蓝色系
  },
  club: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    calendarBg: "#22c55e", // 绿色系
  },
  other: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    calendarBg: "#a855f7", // 紫色系
  },
}

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
    const matches = tags.match(/#[^#\s]+/g)
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
  const orgType = event.extendedProps.organizationType
  const orgTypeColors = ORGANIZATION_TYPE_COLORS[orgType as keyof typeof ORGANIZATION_TYPE_COLORS] || ORGANIZATION_TYPE_COLORS.other
  const orgTypeLabel = orgType === "center" ? "七大中心" : orgType === "club" ? "学生俱乐部" : "其他"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl pr-8">{event.title}</DialogTitle>
            <Badge className={orgTypeColors.bg + " " + orgTypeColors.text}>
              {orgTypeLabel}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {event.extendedProps.imageUrl && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <img
                src={event.extendedProps.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
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
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">发起者</p>
                <p className="text-sm text-muted-foreground">{event.extendedProps.organizer}</p>
              </div>
            </div>

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

          <div>
            <p className="font-medium mb-2">活动内容</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.extendedProps.content}</p>
          </div>

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
