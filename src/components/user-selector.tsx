"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Search, Loader2 } from "lucide-react"
import { RequiredAttendee } from "@/storage/database/shared/schema"
import { getCachedDingTalkUsers, setCachedDingTalkUsers } from "@/lib/dingtalk-cache"

interface UserSelectorProps {
  label?: string
  value: RequiredAttendee[]
  onChange: (users: RequiredAttendee[]) => void
  placeholder?: string
}

export function UserSelector({ label, value, onChange, placeholder = "搜索钉钉用户..." }: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<RequiredAttendee[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 防抖搜索函数（带缓存）
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        // 尝试从缓存获取用户列表
        let allUsers = getCachedDingTalkUsers()

        // 如果缓存不存在或已过期，从 API 获取
        if (!allUsers) {
          const response = await fetch(`/api/dingtalk/users?type=all&detailed=true`)
          const data = await response.json()

          if (data.success) {
            // 转换为 RequiredAttendee 格式
            const fetchedUsers = data.data.map((user: any) => ({
              userid: user.userid,
              name: user.name,
            }))
            allUsers = fetchedUsers
            // 保存到缓存
            setCachedDingTalkUsers(fetchedUsers)
          } else {
            allUsers = []
          }
        }

        // 在客户端进行搜索过滤
        const searchLower = query.toLowerCase().trim()
        const filteredUsers = allUsers.filter((user) => {
          const name = user.name?.toLowerCase() || ""
          const userid = user.userid?.toLowerCase() || ""
          return name.includes(searchLower) || userid.includes(searchLower)
        })

        setSearchResults(filteredUsers)
        setShowResults(true)
      } catch (error) {
        console.error("搜索用户失败:", error)
        setSearchResults([])
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms 防抖延迟
  }, [])

  // 监听搜索输入变化
  useEffect(() => {
    debouncedSearch(searchQuery)
  }, [searchQuery, debouncedSearch])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // 添加用户
  const handleAddUser = (user: RequiredAttendee) => {
    // 检查是否已经添加过
    if (value.some((u) => u.userid === user.userid)) {
      return
    }
    onChange([...value, user])
    setSearchQuery("")
    setShowResults(false)
  }

  // 移除用户
  const handleRemoveUser = (userid: string) => {
    onChange(value.filter((u) => u.userid !== userid))
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      {/* 搜索输入框 */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowResults(true)
              }
            }}
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* 搜索结果下拉列表 */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
            <div className="max-h-60 overflow-y-auto">
              {searchResults.map((user) => {
                const isSelected = value.some((u) => u.userid === user.userid)
                return (
                  <button
                    key={user.userid}
                    type="button"
                    className={`w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent ${
                      isSelected ? "bg-accent/50 cursor-not-allowed opacity-50" : ""
                    }`}
                    onClick={() => !isSelected && handleAddUser(user)}
                    disabled={isSelected}
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {user.userid}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 无结果提示 */}
        {showResults && searchQuery.trim() && searchResults.length === 0 && !loading && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 shadow-md">
            <p className="text-sm text-muted-foreground text-center">未找到匹配的用户</p>
          </div>
        )}
      </div>

      {/* 已选择的用户列表 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((user) => (
            <Badge
              key={user.userid}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleRemoveUser(user.userid)}
            >
              {user.name}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        输入姓名或工号搜索钉钉用户，点击添加。已添加 {value.length} 人。
      </p>
    </div>
  )
}
