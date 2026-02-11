import { Suspense } from "react"
import { CalendarPageContent } from "@/components/calendar-page-content"

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <CalendarPageContent />
    </Suspense>
  )
}
