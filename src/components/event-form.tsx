"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { UserSelector } from "@/components/user-selector"
import { Calendar, Upload, X, Plus, FlaskConical, BookOpen, PartyPopper, Handshake, FileText, Clock } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { ORGANIZER_OPTIONS } from "@/storage/database"
import type { RequiredAttendee } from "@/storage/database/shared/schema"

const eventSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "标题不能为空"),
  content: z.string().optional(),
  datePrecision: z.enum(["exact", "month"]),
  date: z.string().optional(),
  isAllDay: z.boolean().optional(),
  startHour: z.string().optional(),
  endHour: z.string().optional(),
  approximateMonth: z.string().optional(), // YYYY-MM 格式
  location: z.string().optional(),
  organizer: z.array(z.string()).optional(),
  eventType: z.enum([
    "academic_research",
    "teaching_training",
    "student_activities",
    "industry_academia",
    "administration",
    "important_deadlines",
  ]).optional(),
  tags: z.string().optional(),
  link: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
  recurrenceRule: z.enum(["none", "daily", "weekly", "monthly"]),
  recurrenceEndDate: z.string().optional(),
  requiredAttendees: z.array(z.object({
    userid: z.string(),
    name: z.string(),
  })).optional(),
}).superRefine((data, ctx) => {
  // 精确日期时，date 必填
  if (data.datePrecision === "exact") {
    if (!data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "日期不能为空",
        path: ["date"],
      })
    }
    // 只有在非全天事件时，时间才是必填的
    if (!data.isAllDay) {
      if (!data.startHour) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "开始时间不能为空",
          path: ["startHour"],
        })
      }
      if (!data.endHour) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "结束时间不能为空",
          path: ["endHour"],
        })
      }
    }
  }

  // 非精确日期时，approximateMonth 必填
  if (data.datePrecision !== "exact" && !data.approximateMonth) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "请选择大致月份",
      path: ["approximateMonth"],
    })
  }
})

type EventFormData = z.infer<typeof eventSchema>

interface EventFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  trigger?: React.ReactNode
  initialValues?: Partial<EventFormData>
}

// 生成15分钟颗粒度的时间选项（8:00 - 24:00）
const generateTimeOptions = () => {
  const options: string[] = []
  // 从8:00开始到23:45
  for (let hour = 8; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, "0")
      const minuteStr = minute.toString().padStart(2, "0")
      options.push(`${hourStr}:${minuteStr}`)
    }
  }
  // 添加24:00（午夜）
  options.push("24:00")
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// 活动类型配置
const EVENT_TYPE_CONFIG = {
  academic_research: {
    label: "学术研究",
    icon: FlaskConical,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "科研项目、学术讲座、研讨会、论文答辩等学术活动",
  },
  teaching_training: {
    label: "教学培训",
    icon: BookOpen,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "课程培训、技能工作坊、教学活动、在线课程等",
  },
  student_activities: {
    label: "学生活动",
    icon: PartyPopper,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "社团活动、文体比赛、学生聚会、校园文化活动等",
  },
  industry_academia: {
    label: "产学研合作",
    icon: Handshake,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "企业合作项目、实习宣讲、产业对接、校企联合活动等",
  },
  administration: {
    label: "行政管理",
    icon: FileText,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    description: "部门会议、行政通知、制度培训、管理例会等",
  },
  important_deadlines: {
    label: "重要节点",
    icon: Clock,
    color: "text-red-600",
    bgColor: "bg-red-50",
    description: "项目截止、报名截止、材料提交、重要节点提醒等",
  },
} as const

// 表单内容组件
function EventFormContent({
  register,
  handleSubmit,
  setValue,
  watch,
  errors,
  isSubmitting,
  uploading,
  analyzing,
  imageUrl,
  setImageUrl,
  setImageKey,
  handleImageUpload,
  selectedOrganizer,
  setSelectedOrganizer,
  selectedEventType,
  setSelectedEventType,
  currentTag,
  setCurrentTag,
  tagList,
  setTagList,
  handleAddTag,
  handleRemoveTag,
  handleTagKeyDown,
  handleDialogClose,
  setError,
  clearErrors,
  isEditMode,
  requiredAttendees,
  setRequiredAttendees,
}: any) {
  const recurrenceRule = watch("recurrenceRule")

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? "编辑活动" : "创建新活动"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左侧列 */}
          <div className="space-y-4">
                        <div className="space-y-2">
              <Label htmlFor="image">活动图片 (AI 自动填表)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading || analyzing}
                />
                {uploading && <span className="text-sm text-muted-foreground">上传中...</span>}
                {analyzing && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-md">
                    <Spinner className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI分析中...</span>
                  </div>
                )}
              </div>
              {(uploading || analyzing) && (
                <p className="text-xs text-muted-foreground">
                  {uploading && "正在上传图片..."}
                  {analyzing && "正在使用 AI 识别活动信息..."}
                </p>
              )}
              {imageUrl && (
                <div className="relative mt-2">
                  <img
                    src={imageUrl}
                    alt="活动图片"
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => {
                      setImageUrl("")
                      setImageKey("")
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">
                活动标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="请输入活动标题"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <UserSelector
                label="必须到场的人（可选）"
                value={requiredAttendees}
                onChange={(users) => {
                  setRequiredAttendees(users)
                  setValue("requiredAttendees", users)
                }}
                placeholder="搜索钉钉用户姓名"
              />
            </div>

            <div className="space-y-2">
              <SearchableSelect
                label="发起者"
                placeholder="请选择发起者"
                options={ORGANIZER_OPTIONS}
                value={selectedOrganizer}
                onChange={(value) => {
                  const arrayValue = Array.isArray(value) ? value : (value ? [value] : [])
                  setSelectedOrganizer(arrayValue.length > 0 ? arrayValue : undefined)
                  setValue("organizer", arrayValue)
                }}
                allLabel="请选择发起者"
                multiple={true}
                required={false}
              />
              {errors.organizer && (
                <p className="text-sm text-destructive">{errors.organizer.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <SearchableSelect
                label="活动类型"
                placeholder="请选择活动类型"
                options={Object.keys(EVENT_TYPE_CONFIG).map(key => {
                  const config = EVENT_TYPE_CONFIG[key as keyof typeof EVENT_TYPE_CONFIG]
                  return config.label
                })}
                value={selectedEventType ? (() => {
                  const config = EVENT_TYPE_CONFIG[selectedEventType as keyof typeof EVENT_TYPE_CONFIG]
                  return config?.label || selectedEventType
                })() : undefined}
                onChange={(value) => {
                  // Convert label back to key
                  if (value && typeof value === 'string') {
                    const entry = Object.entries(EVENT_TYPE_CONFIG).find(([_, config]) => config.label === value)
                    const key = entry ? entry[0] : value
                    setSelectedEventType(key)
                    setValue("eventType", key as any)
                  } else {
                    setSelectedEventType(undefined)
                    setValue("eventType", undefined)
                  }
                }}
                allLabel="请选择活动类型"
                multiple={false}
                tooltipContent={
                  <div className="space-y-2">
                    <p className="font-semibold">活动类型说明</p>
                    {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon
                      return (
                        <div key={key} className="flex items-start gap-2 text-xs">
                          <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${config.color}`} />
                          <div>
                            <span className="font-medium">{config.label}：</span>
                            <span className="text-muted-foreground">{config.description}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                }
              />
              {errors.eventType && (
                <p className="text-sm text-destructive">{errors.eventType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">地点</Label>
              <Input
                id="location"
                {...register("location")}
                placeholder="请输入活动地点"
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

          </div>

          {/* 右侧列 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="datePrecision">日期精确度</Label>
              <Select
                value={watch("datePrecision")}
                onValueChange={(value) => setValue("datePrecision", value as any)}
              >
                <SelectTrigger id="datePrecision">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">精确日期和时间</SelectItem>
                  <SelectItem value="month">日期待定</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择"日期待定"的事件会在月视图和年视图中特殊显示
              </p>
            </div>

            {watch("datePrecision") === "exact" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date">
                    活动日期 <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input id="date" type="date" {...register("date")} className="flex-1" />
                    <div className="flex items-center space-x-2 whitespace-nowrap">
                      <Switch
                        id="isAllDay"
                        checked={watch("isAllDay") || false}
                        onCheckedChange={(checked) => setValue("isAllDay", checked)}
                      />
                      <Label htmlFor="isAllDay" className="cursor-pointer">
                        全天
                      </Label>
                    </div>
                  </div>
                  {errors.date && (
                    <p className="text-sm text-destructive">{errors.date.message}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="approximateMonth">
                  大致月份 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="approximateMonth"
                  type="month"
                  {...register("approximateMonth")}
                  placeholder="YYYY-MM"
                />
                {errors.approximateMonth && (
                  <p className="text-sm text-destructive">{errors.approximateMonth.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {watch("datePrecision") === "month" && '事件将在该月份显示为"日期待定"'}
                </p>
              </div>
            )}

            {watch("datePrecision") === "exact" && !watch("isAllDay") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startHour">
                    开始时刻 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch("startHour")}
                    onValueChange={(value) => setValue("startHour", value)}
                  >
                    <SelectTrigger id="startHour">
                      <SelectValue placeholder="请选择开始时刻" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.startHour && (
                    <p className="text-sm text-destructive">{errors.startHour.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endHour">
                    结束时刻 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch("endHour")}
                    onValueChange={(value) => {
                      const startHour = watch("startHour")
                      // 检查结束时刻是否早于开始时刻
                      if (startHour && value < startHour) {
                        // 设置错误信息
                        setError("endHour", {
                          type: "manual",
                          message: "结束时刻不能早于开始时刻",
                        })
                      } else {
                        clearErrors("endHour")
                        setValue("endHour", value)
                      }
                    }}
                  >
                    <SelectTrigger id="endHour">
                      <SelectValue placeholder="请选择结束时刻" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.endHour && (
                    <p className="text-sm text-destructive">{errors.endHour.message}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="recurrenceRule">重复规则</Label>
              <Select
                value={watch("recurrenceRule")}
                onValueChange={(value) => setValue("recurrenceRule", value as any)}
              >
                <SelectTrigger id="recurrenceRule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不重复</SelectItem>
                  <SelectItem value="daily">每个工作日</SelectItem>
                  <SelectItem value="weekly">每周</SelectItem>
                  <SelectItem value="monthly">每月</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurrenceRule !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="recurrenceEndDate">重复结束日期</Label>
                <Input
                  id="recurrenceEndDate"
                  type="date"
                  {...register("recurrenceEndDate")}
                />
                {errors.recurrenceEndDate && (
                  <p className="text-sm text-destructive">{errors.recurrenceEndDate.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="link">活动链接</Label>
              <Input
                id="link"
                {...register("link")}
                placeholder="https://..."
              />
              {errors.link && (
                <p className="text-sm text-destructive">{errors.link.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">标签（限20字/个）</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="#标签#"
                  onKeyDown={handleTagKeyDown}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tagList.map((tag: string, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                例如：#zbar# #动手实践# #具身智能# #直播# #外事活动# #截止日期#等自定义标签。
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="content">活动内容</Label>
          <Textarea
            id="content"
            {...register("content")}
            placeholder="请输入活动详细内容"
            rows={4}
          />
          {errors.content && (
            <p className="text-sm text-destructive">{errors.content.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDialogClose}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (isEditMode ? "更新中..." : "创建中...") : (isEditMode ? "更新" : "创建")}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

export function EventForm({
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  trigger,
  initialValues,
}: EventFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [imageKey, setImageKey] = useState<string>("")
  const [currentTag, setCurrentTag] = useState<string>("")
  const [tagList, setTagList] = useState<string[]>([])
  const [selectedOrganizer, setSelectedOrganizer] = useState<string[] | undefined>(undefined)
  const [selectedEventType, setSelectedEventType] = useState<string | undefined>(undefined)
  const [requiredAttendees, setRequiredAttendees] = useState<RequiredAttendee[]>([])

  // 如果提供了 controlledOpen，使用它；否则使用内部状态
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      content: "",
      datePrecision: "exact",
      date: "",
      isAllDay: false,
      startHour: "",
      endHour: "",
      approximateMonth: "",
      location: "",
      organizer: [],
      eventType: undefined,
      tags: "",
      link: "",
      recurrenceRule: "none",
      recurrenceEndDate: "",
      requiredAttendees: [],
    },
  })

  const recurrenceRule = watch("recurrenceRule")

  // 当 Dialog 关闭时重置表单状态
  useEffect(() => {
    if (!open) {
      // Dialog 关闭时重置表单
      console.log("Dialog 关闭，重置表单状态")
      reset()
      setImageUrl("")
      setImageKey("")
      setTagList([])
      setCurrentTag("")
      setSelectedOrganizer(undefined)
      setSelectedEventType(undefined)
      setRequiredAttendees([])
    }
  }, [open, reset])

  // 当 initialValues 变化时，更新表单值和相关状态
  useEffect(() => {
    if (initialValues && open) {
      // Convert comma-separated strings to arrays for multi-select fields
      const organizerArray = initialValues.organizer
        ? (typeof initialValues.organizer === 'string'
            ? (initialValues.organizer as string).split(',').filter((s: string) => s.trim())
            : Array.isArray(initialValues.organizer) ? initialValues.organizer : [initialValues.organizer as string])
        : []

      const eventTypeValue = initialValues.eventType
        ? (typeof initialValues.eventType === 'string'
            ? (initialValues.eventType as string).split(',').filter((s: string) => s.trim())[0]
            : Array.isArray(initialValues.eventType) ? initialValues.eventType[0] : initialValues.eventType)
        : undefined

      // 检测是否为全天活动（通过时间判断）
      let isAllDay = (initialValues as any).isAllDay || false
      if (initialValues.startHour === "00:00" && initialValues.endHour === "23:59") {
        isAllDay = true
      }

      // 处理必须到场的人
      let attendeesArray: RequiredAttendee[] = []
      if ((initialValues as any).requiredAttendees) {
        const rawAttendees = (initialValues as any).requiredAttendees
        if (typeof rawAttendees === 'string') {
          try {
            attendeesArray = JSON.parse(rawAttendees)
          } catch {
            attendeesArray = []
          }
        } else if (Array.isArray(rawAttendees)) {
          attendeesArray = rawAttendees
        }
      }

      // 使用 reset 而不是 setValue，确保表单状态正确更新
      reset({
        id: initialValues.id,
        title: initialValues.title || "",
        content: initialValues.content || "",
        datePrecision: (initialValues as any).datePrecision || "exact",
        date: initialValues.date || "",
        isAllDay: isAllDay,
        startHour: initialValues.startHour || "",
        endHour: initialValues.endHour || "",
        approximateMonth: (initialValues as any).approximateMonth || "",
        location: initialValues.location || "",
        organizer: organizerArray,
        eventType: eventTypeValue as any,
        tags: initialValues.tags || "",
        link: initialValues.link || "",
        recurrenceRule: initialValues.recurrenceRule || "none",
        recurrenceEndDate: initialValues.recurrenceEndDate || "",
        requiredAttendees: attendeesArray,
      })

      // 更新图片 URL
      if (initialValues.imageUrl !== undefined) {
        setImageUrl(initialValues.imageUrl)
      }

      // 更新标签列表
      if (initialValues.tags) {
        const tags = initialValues.tags.match(/#[^#]+#/g) || []
        setTagList(tags)
      }

      // 更新组织者和活动类型
      setSelectedOrganizer(organizerArray.length > 0 ? organizerArray : undefined)
      setSelectedEventType(eventTypeValue)
      setRequiredAttendees(attendeesArray)
    }
  }, [initialValues, open, reset])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("上传失败")

      const data = await response.json()
      setImageUrl(data.imageUrl)
      setImageKey(data.fileKey)

      // Automatically analyze the uploaded image
      analyzeImage(data.imageUrl)
    } catch (error) {
      console.error("上传图片失败:", error)
      alert("上传图片失败，请重试")
    } finally {
      setUploading(false)
    }
  }

  const analyzeImage = async (imageUrl: string) => {
    setAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      })

      if (!response.ok) {
        console.error("图片分析失败")
        return
      }

      const result = await response.json()
      if (!result.success || !result.data) {
        console.error("图片分析返回无效数据")
        return
      }

      const extracted = result.data

      // Auto-fill form fields with extracted data (only if current field is empty)
      if (extracted.title && !watch("title")) {
        setValue("title", extracted.title)
      }

      if (extracted.content && !watch("content")) {
        setValue("content", extracted.content)
      }

      if (extracted.location && !watch("location")) {
        setValue("location", extracted.location)
      }

      if (extracted.link && !watch("link")) {
        setValue("link", extracted.link)
      }

      // Handle date and time
      if (extracted.date) {
        if (extracted.datePrecision === "month") {
          setValue("datePrecision", "month")
          setValue("approximateMonth", extracted.date)
        } else if (extracted.datePrecision === "exact") {
          setValue("datePrecision", "exact")
          if (!watch("date")) {
            setValue("date", extracted.date)
          }
          if (extracted.startTime && !watch("startHour")) {
            setValue("startHour", extracted.startTime)
          }
          if (extracted.endTime && !watch("endHour")) {
            setValue("endHour", extracted.endTime)
          }
        }
      }

      // Handle organizers
      if (extracted.organizers && extracted.organizers.length > 0 && !selectedOrganizer?.length) {
        setSelectedOrganizer(extracted.organizers)
        setValue("organizer", extracted.organizers)
      }

      // Handle event type
      if (extracted.eventType && !selectedEventType) {
        setSelectedEventType(extracted.eventType)
        setValue("eventType", extracted.eventType as any)
      }

      // Handle tags
      if (extracted.tags && extracted.tags.length > 0 && tagList.length === 0) {
        setTagList(extracted.tags)
      }

      console.log("图片分析成功，已自动填充表单", extracted)
    } catch (error) {
      console.error("图片分析失败:", error)
    } finally {
      setAnalyzing(false)
    }
  }

  // 添加标签（支持一次性添加多个标签）
  const handleAddTag = () => {
    if (!currentTag.trim()) return

    // 按空格分割，支持多个标签
    const tagParts = currentTag.trim().split(/\s+/)
    const newTags: string[] = []

    for (let part of tagParts) {
      if (!part.trim()) continue

      let tagText = part.trim()
      // 如果没有#，自动添加
      if (!tagText.startsWith("#")) {
        tagText = `#${tagText}`
      }
      if (!tagText.endsWith("#")) {
        tagText = `${tagText}#`
      }

      // 检查长度限制（每个标签最多20字）
      const tagContent = tagText.replace(/#/g, "")
      if (tagContent.length > 20) {
        alert(`标签 "${tagText}" 超过20个字，已跳过`)
        continue
      }

      // 检查是否重复
      if (tagList.includes(tagText) || newTags.includes(tagText)) {
        continue
      }

      newTags.push(tagText)
    }

    setTagList([...tagList, ...newTags])
    setCurrentTag("")
  }

  // 支持回车添加标签
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setTagList(tagList.filter((tag) => tag !== tagToRemove))
  }

  const handleDialogClose = () => {
    setOpen(false)
    reset()
    setImageUrl("")
    setImageKey("")
    setTagList([])
    setCurrentTag("")
    setSelectedOrganizer(undefined)
    setSelectedEventType(undefined)
    setRequiredAttendees([])
  }

  const onSubmit = async (data: EventFormData) => {
    console.log("=== 表单提交开始 ===")
    console.log("表单数据:", data)
    console.log("initialValues:", initialValues)

    try {
      // 使用标签列表（tagList 是唯一的数据源）
      const allTags = tagList.join(" ")

      // 检查是否是编辑模式
      const isEditMode = !!initialValues?.id
      const eventId = initialValues?.id

      console.log("编辑模式:", isEditMode, "事件ID:", eventId)

      const url = isEditMode ? `/api/events/${eventId}` : "/api/events"
      const method = isEditMode ? "PUT" : "POST"

      // 根据日期精确度设置时间
      let startTime: string
      let endTime: string

      if (data.datePrecision === "exact") {
        if (data.isAllDay) {
          // 全天活动：00:00 到 23:59
          startTime = new Date(`${data.date}T00:00:00`).toISOString()
          endTime = new Date(`${data.date}T23:59:59`).toISOString()
        } else {
          // 精确日期：使用具体日期和时间
          startTime = new Date(`${data.date}T${data.startHour}:00`).toISOString()
          endTime = new Date(`${data.date}T${data.endHour}:00`).toISOString()
        }
      } else {
        // 待定日期：使用月份第15天的全天时间（使用 UTC 避免时区偏移）
        const [year, month] = data.approximateMonth!.split("-")
        startTime = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 15, 0, 0, 0)).toISOString()
        endTime = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 15, 23, 59, 59)).toISOString()
      }

      const requestBody = {
        ...data,
        startTime,
        endTime,
        datePrecision: data.datePrecision,
        approximateMonth: data.datePrecision !== "exact" ? data.approximateMonth : null,
        tags: allTags,
        imageUrl,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
        organizer: data.organizer && data.organizer.length > 0 ? data.organizer.join(',') : null, // Convert array to comma-separated string or null
        eventType: data.eventType || null, // Single value, no need to join
        requiredAttendees: data.requiredAttendees && data.requiredAttendees.length > 0
          ? JSON.stringify(data.requiredAttendees)
          : null,
      }

      console.log("请求URL:", url)
      console.log("请求方法:", method)
      console.log("请求体:", requestBody)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("响应状态:", response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API错误响应:", errorData)
        throw new Error(isEditMode ? "更新活动失败" : "创建活动失败")
      }

      const result = await response.json()
      console.log("API成功响应:", result)

      console.log("准备关闭对话框和重置状态...")
      setOpen(false)
      reset()
      setImageUrl("")
      setImageKey("")
      setTagList([])
      setCurrentTag("")
      setSelectedOrganizer(undefined)
      setSelectedEventType(undefined)
      setRequiredAttendees([])

      console.log("调用 onSuccess 回调...")
      onSuccess?.()
      console.log("=== 表单提交完成 ===")
    } catch (error) {
      console.error("操作失败:", error)
      console.error("错误详情:", error instanceof Error ? error.message : error)
      alert(initialValues?.id ? "更新活动失败，请重试" : "创建活动失败，请重试")
    }
  }

  // 如果有 trigger，使用受控的 DialogTrigger 模式
  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
          <EventFormContent
            register={register}
            handleSubmit={handleSubmit(onSubmit)}
            setValue={setValue}
            watch={watch}
            errors={errors}
            setError={setError}
            clearErrors={clearErrors}
            isSubmitting={isSubmitting}
            uploading={uploading}
            analyzing={analyzing}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            setImageKey={setImageKey}
            handleImageUpload={handleImageUpload}
            selectedOrganizer={selectedOrganizer}
            setSelectedOrganizer={setSelectedOrganizer}
            selectedEventType={selectedEventType}
            setSelectedEventType={setSelectedEventType}
            currentTag={currentTag}
            setCurrentTag={setCurrentTag}
            tagList={tagList}
            setTagList={setTagList}
            handleAddTag={handleAddTag}
            handleRemoveTag={handleRemoveTag}
            handleTagKeyDown={handleTagKeyDown}
            handleDialogClose={handleDialogClose}
            isEditMode={!!initialValues?.id}
            requiredAttendees={requiredAttendees}
            setRequiredAttendees={setRequiredAttendees}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // 否则，使用独立的 Dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
        <EventFormContent
          register={register}
          handleSubmit={handleSubmit(onSubmit)}
          setValue={setValue}
          watch={watch}
          errors={errors}
          setError={setError}
          clearErrors={clearErrors}
          isSubmitting={isSubmitting}
          uploading={uploading}
          analyzing={analyzing}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          setImageKey={setImageKey}
          handleImageUpload={handleImageUpload}
          selectedOrganizer={selectedOrganizer}
          setSelectedOrganizer={setSelectedOrganizer}
          selectedEventType={selectedEventType}
          setSelectedEventType={setSelectedEventType}
          currentTag={currentTag}
          setCurrentTag={setCurrentTag}
          tagList={tagList}
          setTagList={setTagList}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
          handleTagKeyDown={handleTagKeyDown}
          handleDialogClose={handleDialogClose}
          isEditMode={!!initialValues?.id}
          requiredAttendees={requiredAttendees}
          setRequiredAttendees={setRequiredAttendees}
        />
      </DialogContent>
    </Dialog>
  )
}
