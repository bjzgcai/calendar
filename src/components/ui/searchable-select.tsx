"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface SearchableSelectProps {
  label: string
  placeholder?: string
  options: string[]
  value?: string
  onChange: (value: string | undefined) => void
  allLabel?: string
}

export function SearchableSelect({
  label,
  placeholder = "全部",
  options,
  value,
  onChange,
  allLabel = "全部",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  const selectedValue = value === "" ? undefined : value

  const handleSelect = (option: string) => {
    if (option === "") {
      onChange(undefined)
    } else {
      onChange(option)
    }
    setOpen(false)
    setSearch("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>{label}</Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between h-9 px-3 text-left font-normal",
            !selectedValue && "text-muted-foreground"
          )}
          onClick={() => setOpen(!open)}
        >
          <span className="truncate">
            {selectedValue || placeholder}
          </span>
          <div className="flex items-center gap-2">
            {selectedValue && (
              <X
                className="h-4 w-4 hover:bg-accent rounded"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4" />
          </div>
        </Button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="p-2 border-b">
              <Input
                placeholder="搜索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
                autoFocus
              />
            </div>
            <div className="py-1">
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                  !selectedValue && "bg-accent"
                )}
                onClick={() => handleSelect("")}
              >
                {allLabel}
                {!selectedValue && <Check className="h-4 w-4" />}
              </button>
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                    selectedValue === option && "bg-accent"
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <span className="truncate">{option}</span>
                  {selectedValue === option && <Check className="h-4 w-4" />}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  无匹配项
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
