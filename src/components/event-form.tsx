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
import { Calendar, Upload, X, Plus } from "lucide-react"
import { ORGANIZER_OPTIONS } from "@/storage/database"

const eventSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "标题不能为空"),
  content: z.string().min(1, "内容不能为空"),
  date: z.string().min(1, "日期不能为空"),
  startHour: z.string().min(1, "开始时间不能为空"),
  endHour: z.string().min(1, "结束时间不能为空"),
  location: z.string().optional(),
  organizer: z.string().min(1, "发起者不能为空"),
  tags: z.string().optional(),
  link: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().optional(),
  recurrenceRule: z.enum(["none", "daily", "weekly", "monthly"]),
  recurrenceEndDate: z.string().optional(),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventFormProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  trigger?: React.ReactNode
  initialValues?: Partial<EventFormData>
}

// 生成15分钟颗粒度的时间选项
const generateTimeOptions = () => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const hourStr = hour.toString().padStart(2, "0")
      const minuteStr = minute.toString().padStart(2, "0")
      options.push(`${hourStr}:${minuteStr}`)
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// 表单内容组件
function EventFormContent({
  register,
  handleSubmit,
  setValue,
  watch,
  errors,
  isSubmitting,
  uploading,
  imageUrl,
  setImageUrl,
  setImageKey,
  handleImageUpload,
  selectedOrganizer,
  setSelectedOrganizer,
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
              <SearchableSelect
                label="发起者"
                placeholder="请选择发起者"
                options={ORGANIZER_OPTIONS}
                value={selectedOrganizer}
                onChange={(value) => {
                  setSelectedOrganizer(value)
                  setValue("organizer", value || "")
                }}
                allLabel="请选择发起者"
              />
              {errors.organizer && (
                <p className="text-sm text-destructive">{errors.organizer.message}</p>
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

            <div className="space-y-2">
              <Label htmlFor="image">活动图片（海报）</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <span className="text-sm text-muted-foreground">上传中...</span>}
              </div>
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
          </div>

          {/* 右侧列 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">
                活动日期 <span className="text-destructive">*</span>
              </Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

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
                例如：#zbar# #动手实践# #具身智能# #直播#
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="content">
            活动内容 <span className="text-destructive">*</span>
          </Label>
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
            {isSubmitting ? (isEditMode ? "更新中..." : "创建中...") : (isEditMode ? "更新活动" : "创建活动")}
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
  const [imageUrl, setImageUrl] = useState<string>("")
  const [imageKey, setImageKey] = useState<string>("")
  const [currentTag, setCurrentTag] = useState<string>("")
  const [tagList, setTagList] = useState<string[]>([])
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | undefined>(undefined)

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
      date: "",
      startHour: "",
      endHour: "",
      location: "",
      organizer: "",
      tags: "",
      link: "",
      recurrenceRule: "none",
      recurrenceEndDate: "",
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
    }
  }, [open, reset])

  // 当 initialValues 变化时，更新表单值和相关状态
  useEffect(() => {
    if (initialValues) {
      Object.keys(initialValues).forEach((key) => {
        if (initialValues[key as keyof EventFormData] !== undefined) {
          setValue(key as keyof EventFormData, initialValues[key as keyof EventFormData] as any)
        }
      })
      
      // 更新图片 URL
      if (initialValues.imageUrl !== undefined) {
        setImageUrl(initialValues.imageUrl)
      }
      
      // 更新标签列表
      if (initialValues.tags) {
        const tags = initialValues.tags.match(/#[^#\s]+/g) || []
        setTagList(tags)
      }
      
      // 更新组织者
      if (initialValues.organizer) {
        setSelectedOrganizer(initialValues.organizer)
      }
    }
  }, [initialValues, setValue])

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
    } catch (error) {
      console.error("上传图片失败:", error)
      alert("上传图片失败，请重试")
    } finally {
      setUploading(false)
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
  }

  const onSubmit = async (data: EventFormData) => {
    console.log("=== 表单提交开始 ===")
    console.log("表单数据:", data)
    console.log("initialValues:", initialValues)

    try {
      // 合并标签列表
      const allTags = [...tagList, ...data.tags!.split(" ").filter((t) => t.trim())].join(" ")

      // 检查是否是编辑模式
      const isEditMode = !!initialValues?.id
      const eventId = initialValues?.id

      console.log("编辑模式:", isEditMode, "事件ID:", eventId)

      const url = isEditMode ? `/api/events/${eventId}` : "/api/events"
      const method = isEditMode ? "PUT" : "POST"

      const requestBody = {
        ...data,
        startTime: new Date(`${data.date}T${data.startHour}:00`).toISOString(),
        endTime: new Date(`${data.date}T${data.endHour}:00`).toISOString(),
        tags: allTags,
        imageUrl,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
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
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            setImageKey={setImageKey}
            handleImageUpload={handleImageUpload}
            selectedOrganizer={selectedOrganizer}
            setSelectedOrganizer={setSelectedOrganizer}
            currentTag={currentTag}
            setCurrentTag={setCurrentTag}
            tagList={tagList}
            setTagList={setTagList}
            handleAddTag={handleAddTag}
            handleRemoveTag={handleRemoveTag}
            handleTagKeyDown={handleTagKeyDown}
            handleDialogClose={handleDialogClose}
            isEditMode={!!initialValues?.id}
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
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          setImageKey={setImageKey}
          handleImageUpload={handleImageUpload}
          selectedOrganizer={selectedOrganizer}
          setSelectedOrganizer={setSelectedOrganizer}
          currentTag={currentTag}
          setCurrentTag={setCurrentTag}
          tagList={tagList}
          setTagList={setTagList}
          handleAddTag={handleAddTag}
          handleRemoveTag={handleRemoveTag}
          handleTagKeyDown={handleTagKeyDown}
          handleDialogClose={handleDialogClose}
          isEditMode={!!initialValues?.id}
        />
      </DialogContent>
    </Dialog>
  )
}
