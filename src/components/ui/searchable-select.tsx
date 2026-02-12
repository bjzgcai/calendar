"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SearchableSelectProps {
  label: string
  placeholder?: string
  options: string[]
  value?: string | string[]
  onChange: (value: string | string[] | undefined) => void
  allLabel?: string
  tooltipContent?: React.ReactNode
  multiple?: boolean
  required?: boolean
}

export function SearchableSelect({
  label,
  placeholder = "全部",
  options,
  value,
  onChange,
  allLabel = "全部",
  tooltipContent,
  multiple = false,
  required = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  const selectedValue = value === "" ? undefined : value
  // Ensure selectedArray only contains strings
  const selectedArray = multiple
    ? (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : (value ? [value] : []))
    : []

  const handleSelect = (option: string) => {
    if (multiple) {
      // Multi-select mode
      if (option === "") {
        onChange(undefined)
      } else {
        const newSelection = selectedArray.includes(option)
          ? selectedArray.filter(v => v !== option)
          : [...selectedArray, option]

        onChange(newSelection.length > 0 ? newSelection : undefined)
      }
    } else {
      // Single select mode
      if (option === "") {
        onChange(undefined)
      } else {
        onChange(option)
      }
      setOpen(false)
      setSearch("")
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onChange(undefined)
  }

  const removeItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation()
    e.preventDefault()
    const newSelection = selectedArray.filter(v => v !== item)
    onChange(newSelection.length > 0 ? newSelection : undefined)
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

  // Ensure displayText is always a string
  const displayText = multiple && selectedArray.length > 0
    ? `已选择 ${selectedArray.length} 项`
    : (typeof selectedValue === 'string' ? selectedValue : placeholder)

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center gap-1">
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {tooltipContent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between h-auto min-h-9 px-3 py-2 text-left font-normal",
            !selectedValue && !selectedArray.length && "text-muted-foreground"
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex-1 flex flex-wrap gap-1">
            {multiple && selectedArray.length > 0 ? (
              selectedArray.filter((item): item is string => typeof item === 'string').map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-sm"
                >
                  {item}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-blue-600 rounded transition-colors"
                    onClick={(e) => removeItem(e, item)}
                  />
                </span>
              ))
            ) : (
              <span className="truncate">{displayText}</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {(selectedValue || selectedArray.length > 0) && (
              <X
                className="h-4 w-4 cursor-pointer hover:text-blue-600 rounded flex-shrink-0 transition-colors"
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
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
              {!multiple && (
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
              )}
              {filteredOptions.map((option) => {
                const isSelected = multiple
                  ? selectedArray.includes(option)
                  : selectedValue === option

                return (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between",
                      isSelected && "bg-accent"
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="truncate">{option}</span>
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
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
