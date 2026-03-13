"use client"

import { useRef, useCallback, useEffect } from "react"
import { Download, X, ImageDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PosterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  svgContent: string
}

export function PosterModal({ open, onOpenChange, svgContent }: PosterModalProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null)

  // Ensure SVG is responsive: add viewBox if missing, remove fixed dimensions
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return
    const svgEl = svgContainerRef.current.querySelector("svg")
    if (!svgEl) return
    const w = svgEl.getAttribute("width") || "600"
    const h = svgEl.getAttribute("height") || "900"
    if (!svgEl.getAttribute("viewBox")) {
      svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`)
    }
    // Remove fixed dimensions so CSS can control sizing
    svgEl.removeAttribute("width")
    svgEl.removeAttribute("height")
  }, [svgContent])

  const handleDownloadSVG = useCallback(() => {
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `活动海报_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [svgContent])

  const handleDownloadPNG = useCallback(() => {
    // For PNG export, use the original svgContent (with correct dimensions) rendered to canvas
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgContent, "image/svg+xml")
    const originalSvg = doc.querySelector("svg")
    if (!originalSvg) return

    const svgWidth = Number(originalSvg.getAttribute("width")) || 600
    const svgHeight = Number(originalSvg.getAttribute("height")) || 900

    const canvas = document.createElement("canvas")
    const scale = 2 // 2x for retina quality
    canvas.width = svgWidth * scale
    canvas.height = svgHeight * scale

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(scale, scale)

    const img = new Image()
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const link = document.createElement("a")
      link.download = `活动海报_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.png`
      link.href = canvas.toDataURL("image/png")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      handleDownloadSVG()
    }

    img.src = url
  }, [svgContent, handleDownloadSVG])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] w-full max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">活动海报预览</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSVG}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                下载 SVG
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPNG}
                className="gap-1.5"
              >
                <ImageDown className="h-3.5 w-3.5" />
                下载 PNG
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">关闭</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 flex items-start justify-center p-4">
          <div
            ref={svgContainerRef}
            className="shadow-xl rounded-lg overflow-hidden w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
            style={{ lineHeight: 0, maxWidth: 640 }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
