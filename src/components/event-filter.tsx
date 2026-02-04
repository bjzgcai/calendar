"use client"

import { useState, useEffect } from "react"
import { Filter, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ORGANIZER_OPTIONS } from "@/storage/database"

interface TagWithCount {
  name: string
  count: number
}

interface EventFilterProps {
  onOrganizerChange: (organizer: string | undefined) => void
  onTagsChange: (tags: string[]) => void
  onMyEventsChange: (myEvents: boolean) => void
}

export function EventFilter({ onOrganizerChange, onTagsChange, onMyEventsChange }: EventFilterProps) {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | undefined>(undefined)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [myEvents, setMyEvents] = useState<boolean>(false)
  const [tagSearchQuery, setTagSearchQuery] = useState<string>("")
  const [showAllTags, setShowAllTags] = useState<boolean>(false)

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

  const handleOrganizerChange = (organizer: string | undefined) => {
    setSelectedOrganizer(organizer)
    onOrganizerChange(organizer)
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
    setSelectedOrganizer(undefined)
    setSelectedTags([])
    setMyEvents(false)
    onOrganizerChange(undefined)
    onTagsChange([])
    onMyEventsChange(false)
    setTagSearchQuery("")
  }

  // Filter tags based on search query
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  )

  // Show top 5 tags or all if showAllTags is true
  const displayedTags = showAllTags ? filteredTags : filteredTags.slice(0, 5)

  const hasFilters = selectedOrganizer !== undefined || selectedTags.length > 0 || myEvents

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

          <SearchableSelect
            label="发起者"
            placeholder="全部发起者"
            options={organizers}
            value={selectedOrganizer}
            onChange={handleOrganizerChange}
            allLabel="全部发起者"
          />

          <div className="space-y-2">
            <Label>标签</Label>

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
        </div>
      </CardContent>
    </Card>
  )
}
