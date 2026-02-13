"use client"

import { useState, useEffect } from "react"

// Declare DingTalk types
declare global {
  interface Window {
    dd?: {
      ready: (callback: () => void) => void;
      biz: {
        util: {
          openLink: (options: {
            url: string;
            onSuccess?: (result: unknown) => void;
            onFail?: (err: unknown) => void;
          }) => void;
        };
      };
    };
  }
}
import { Filter, X, Search, Tag, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ORGANIZER_OPTIONS, EVENT_TYPE_COLORS, EventType } from "@/storage/database"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TagWithCount {
  name: string
  count: number
}

interface EventFilterProps {
  onEventTypeChange: (eventType: string | string[] | undefined) => void
  onOrganizerChange: (organizer: string | string[] | undefined) => void
  onTagsChange: (tags: string[]) => void
  onMyEventsChange: (myEvents: boolean) => void
}

export function EventFilter({ onEventTypeChange, onOrganizerChange, onTagsChange, onMyEventsChange }: EventFilterProps) {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [selectedEventType, setSelectedEventType] = useState<string[] | undefined>(undefined)
  const [selectedOrganizer, setSelectedOrganizer] = useState<string[] | undefined>(undefined)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [myEvents, setMyEvents] = useState<boolean>(false)
  const [tagSearchQuery, setTagSearchQuery] = useState<string>("")
  const [showAllTags, setShowAllTags] = useState<boolean>(false)
  const isMobile = !useMediaQuery("(min-width: 1024px)")
  const [isOpen, setIsOpen] = useState(false)

  // 活动类型选项（根据 EVENT_TYPE_COLORS 生成）
  const eventTypeOptions = Object.entries(EVENT_TYPE_COLORS).map(([value, config]) => ({
    value,
    label: config.label,
  }))

  // 发起者使用固定选项
  const organizers = ORGANIZER_OPTIONS

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tagRes = await fetch("/api/events/tags")

        if (tagRes.ok) {
          const tagData = await tagRes.json()
          setTags(tagData)
        }
      } catch (error) {
        console.error("获取过滤选项失败:", error)
      }
    }

    fetchData()
  }, [])

  const handleEventTypeChange = (eventType: string | string[] | undefined) => {
    const arrayValue = Array.isArray(eventType) ? eventType : (eventType ? [eventType] : undefined)
    setSelectedEventType(arrayValue)
    onEventTypeChange(arrayValue)
  }

  const handleOrganizerChange = (organizer: string | string[] | undefined) => {
    const arrayValue = Array.isArray(organizer) ? organizer : (organizer ? [organizer] : undefined)
    setSelectedOrganizer(arrayValue)
    onOrganizerChange(arrayValue)
  }

  const handleEventTypeCheckboxChange = (eventType: string, checked: boolean) => {
    const newTypes = checked
      ? [...(selectedEventType || []), eventType]
      : (selectedEventType || []).filter(t => t !== eventType)
    const finalValue = newTypes.length > 0 ? newTypes : undefined
    setSelectedEventType(finalValue)
    onEventTypeChange(finalValue)
  }

  const handleOrganizerCheckboxChange = (organizer: string, checked: boolean) => {
    const newOrganizers = checked
      ? [...(selectedOrganizer || []), organizer]
      : (selectedOrganizer || []).filter(o => o !== organizer)
    const finalValue = newOrganizers.length > 0 ? newOrganizers : undefined
    setSelectedOrganizer(finalValue)
    onOrganizerChange(finalValue)
  }

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      const newTags = [...selectedTags, tag]
      setSelectedTags(newTags)
      onTagsChange(newTags)
      setTagSearchQuery("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    const newTags = selectedTags.filter((t) => t !== tag)
    setSelectedTags(newTags)
    onTagsChange(newTags)
  }

  const handleMyEventsChange = (checked: boolean) => {
    setMyEvents(checked)
    onMyEventsChange(checked)
  }

  const handleClear = () => {
    setSelectedEventType(undefined)
    setSelectedOrganizer(undefined)
    setSelectedTags([])
    setMyEvents(false)
    onEventTypeChange(undefined)
    onOrganizerChange(undefined)
    onTagsChange([])
    onMyEventsChange(false)
    setTagSearchQuery("")
  }

  // Handle DingTalk AI Assistant button click
  const handleAIAssistantClick = () => {
    if (typeof window !== 'undefined' && window.dd) {
      window.dd.ready(() => {
        window.dd?.biz.util.openLink({
          url: "https://applink.dingtalk.com/client/aiAgent?assistantId=6ce459779cff4ed5b56e097a8bc8284b&from=share",
          onSuccess: (result) => {
            console.log('AI助理打开成功', result);
          },
          onFail: (err) => {
            console.error('AI助理打开失败', err);
          },
        });
      });
    } else {
      // Fallback for non-DingTalk environment
      window.open("https://applink.dingtalk.com/client/aiAgent?assistantId=6ce459779cff4ed5b56e097a8bc8284b&from=share", "_blank");
    }
  }

  // Filter tags based on search query
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  )

  // Show top 5 tags or all if showAllTags is true
  const displayedTags = showAllTags ? filteredTags : filteredTags.slice(0, 5)

  const hasFilters = (selectedEventType && selectedEventType.length > 0) || (selectedOrganizer && selectedOrganizer.length > 0) || selectedTags.length > 0 || myEvents

  // 移动端：显示浮动按钮
  if (isMobile && !isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 shadow-lg"
        size="sm"
      >
        <Filter className="h-4 w-4 mr-2" />
        筛选条件
        {hasFilters && (
          <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-xs font-bold">
            {(selectedEventType?.length || 0) + (selectedOrganizer?.length || 0) + selectedTags.length + (myEvents ? 1 : 0)}
          </span>
        )}
      </Button>
    )
  }

  // 移动端：展开的筛选面板（覆盖层）
  if (isMobile && isOpen) {
    return (
      <>
        {/* 背景遮罩 */}
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />

        {/* 筛选面板 */}
        <Card className="fixed top-0 left-0 right-0 bottom-0 z-50 rounded-none overflow-y-auto">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <h3 className="font-medium">筛选条件</h3>
              </div>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <X className="mr-2 h-3 w-3" />
                    清除筛选
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="myEvents"
              checked={myEvents}
              onCheckedChange={handleMyEventsChange}
            />
            <Label
              htmlFor="myEvents"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              只看我创建的活动
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="font-medium">活动类型</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2.5 py-1">
                      <div className="font-semibold text-xs mb-2">活动类型说明</div>
                      {Object.entries(EVENT_TYPE_COLORS).map(([key, config]) => (
                        <div key={key} className="flex items-start gap-2 text-xs">
                          <div
                            className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: config.calendarBg }}
                          />
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                              {config.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-2 pl-2">
              {eventTypeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`eventType-mobile-${option.value}`}
                    checked={selectedEventType?.includes(option.value) || false}
                    onCheckedChange={(checked) =>
                      handleEventTypeCheckboxChange(option.value, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`eventType-mobile-${option.value}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: EVENT_TYPE_COLORS[option.value as EventType]?.calendarBg }}
                    />
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">发起者</Label>
            <div className="space-y-2 pl-2">
              {organizers.map((organizer) => (
                <div key={organizer} className="flex items-center space-x-2">
                  <Checkbox
                    id={`organizer-mobile-${organizer}`}
                    checked={selectedOrganizer?.includes(organizer) || false}
                    onCheckedChange={(checked) =>
                      handleOrganizerCheckboxChange(organizer, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`organizer-mobile-${organizer}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {organizer}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <Label>标签</Label>
            </div>

            {/* Selected Tags Pills */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Tag Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索标签..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Tag Suggestions */}
            {(tagSearchQuery || displayedTags.length > 0) && (
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
                {displayedTags.length > 0 ? (
                  <>
                    {displayedTags.map((tag) => (
                      <button
                        key={tag.name}
                        onClick={() => handleAddTag(tag.name)}
                        disabled={selectedTags.includes(tag.name)}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                      >
                        <span>{tag.name}</span>
                        <span className="text-xs text-muted-foreground">({tag.count})</span>
                      </button>
                    ))}
                    {!showAllTags && filteredTags.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAllTags(true)}
                      >
                        显示全部 {filteredTags.length} 个标签
                      </Button>
                    )}
                    {showAllTags && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAllTags(false)}
                      >
                        收起
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    未找到匹配的标签
                  </p>
                )}
              </div>
            )}

            {selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground">
                已选择 {selectedTags.length} 个标签（显示包含所有标签的活动）
              </p>
            )}
          </div>

          {/* 两院人力 AI助理按钮 */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAIAssistantClick}
            >
              🤖 两院人力 AI助理
            </Button>
          </div>
        </div>

        {/* 移动端底部确认按钮 */}
        {isMobile && (
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t mt-4">
            <Button
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              确认筛选
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
      </>
    )
  }

  // 桌面端：普通卡片显示
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-medium">筛选条件</h3>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="mr-2 h-3 w-3" />
              清除筛选
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="myEvents"
              checked={myEvents}
              onCheckedChange={handleMyEventsChange}
            />
            <Label
              htmlFor="myEvents"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              只看我创建的活动
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="font-medium">活动类型</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2.5 py-1">
                      <div className="font-semibold text-xs mb-2">活动类型说明</div>
                      {Object.entries(EVENT_TYPE_COLORS).map(([key, config]) => (
                        <div key={key} className="flex items-start gap-2 text-xs">
                          <div
                            className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: config.calendarBg }}
                          />
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                              {config.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-2 pl-2">
              {eventTypeOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`eventType-desktop-${option.value}`}
                    checked={selectedEventType?.includes(option.value) || false}
                    onCheckedChange={(checked) =>
                      handleEventTypeCheckboxChange(option.value, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`eventType-desktop-${option.value}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: EVENT_TYPE_COLORS[option.value as EventType]?.calendarBg }}
                    />
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">发起者</Label>
            <div className="space-y-2 pl-2">
              {organizers.map((organizer) => (
                <div key={organizer} className="flex items-center space-x-2">
                  <Checkbox
                    id={`organizer-desktop-${organizer}`}
                    checked={selectedOrganizer?.includes(organizer) || false}
                    onCheckedChange={(checked) =>
                      handleOrganizerCheckboxChange(organizer, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`organizer-desktop-${organizer}`}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {organizer}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <Label>标签</Label>
            </div>

            {/* Selected Tags Pills */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Tag Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索标签..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Tag Suggestions */}
            {(tagSearchQuery || displayedTags.length > 0) && (
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
                {displayedTags.length > 0 ? (
                  <>
                    {displayedTags.map((tag) => (
                      <button
                        key={tag.name}
                        onClick={() => handleAddTag(tag.name)}
                        disabled={selectedTags.includes(tag.name)}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                      >
                        <span>{tag.name}</span>
                        <span className="text-xs text-muted-foreground">({tag.count})</span>
                      </button>
                    ))}
                    {!showAllTags && filteredTags.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAllTags(true)}
                      >
                        显示全部 {filteredTags.length} 个标签
                      </Button>
                    )}
                    {showAllTags && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowAllTags(false)}
                      >
                        收起
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    未找到匹配的标签
                  </p>
                )}
              </div>
            )}

            {selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground">
                已选择 {selectedTags.length} 个标签（显示包含所有标签的活动）
              </p>
            )}
          </div>

          {/* 两院人力 AI助理按钮 */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAIAssistantClick}
            >
              🤖 两院人力 AI助理
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
