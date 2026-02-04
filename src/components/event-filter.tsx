"use client"

import { useState, useEffect } from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ORGANIZER_OPTIONS } from "@/storage/database"

interface EventFilterProps {
  onOrganizerChange: (organizer: string | undefined) => void
  onTagChange: (tag: string | undefined) => void
}

export function EventFilter({ onOrganizerChange, onTagChange }: EventFilterProps) {
  const [tags, setTags] = useState<string[]>([])
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | undefined>(undefined)
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined)

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

  const handleTagChange = (tag: string | undefined) => {
    setSelectedTag(tag)
    onTagChange(tag)
  }

  const handleClear = () => {
    setSelectedOrganizer(undefined)
    setSelectedTag(undefined)
    onOrganizerChange(undefined)
    onTagChange(undefined)
  }

  const hasFilters = selectedOrganizer !== undefined || selectedTag !== undefined

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
          <SearchableSelect
            label="发起者"
            placeholder="全部发起者"
            options={organizers}
            value={selectedOrganizer}
            onChange={handleOrganizerChange}
            allLabel="全部发起者"
          />

          <SearchableSelect
            label="标签"
            placeholder="全部标签"
            options={tags}
            value={selectedTag}
            onChange={handleTagChange}
            allLabel="全部标签"
          />
        </div>
      </CardContent>
    </Card>
  )
}
