import { test, expect, Page } from "@playwright/test"

type MockEvent = {
  id: string
  title: string
  start: string
  end: string
  extendedProps: {
    organizer: string
    organizationType: string
    tags: string
  }
}

function buildEvent(id: string, title: string, date: string): MockEvent {
  return {
    id,
    title,
    start: `${date}T10:00:00`,
    end: `${date}T11:00:00`,
    extendedProps: {
      organizer: "Test Organizer",
      organizationType: "academy",
      tags: "",
    },
  }
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDays(base: Date, days: number) {
  const result = new Date(base)
  result.setDate(base.getDate() + days)
  return result
}

function buildPastEventsInCurrentMonth(today: Date, titlePrefix: string) {
  const events: MockEvent[] = []

  for (let day = 1; day < today.getDate(); day += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), day)
    events.push(buildEvent(`past-${day}`, `${titlePrefix} ${day}`, formatDateKey(date)))
  }

  return events
}

async function mockEvents(page: Page, events: MockEvent[]) {
  await page.route("**/api/events**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname !== "/api/events") {
      await route.continue()
      return
    }

    const startDateRaw = url.searchParams.get("startDate")
    const endDateRaw = url.searchParams.get("endDate")

    if (!startDateRaw || !endDateRaw) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(events),
      })
      return
    }

    const startDate = new Date(startDateRaw)
    const endDate = new Date(endDateRaw)
    const inRangeEvents = events.filter((event) => {
      const eventStart = new Date(event.start)
      return eventStart >= startDate && eventStart <= endDate
    })

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(inRangeEvents),
    })
  })
}

async function getListScrollTop(page: Page) {
  return await page.evaluate(() => {
    const container = document.querySelector<HTMLDivElement>(
      "div.space-y-6.flex-1.overflow-y-auto"
    )
    return container?.scrollTop ?? 0
  })
}

test.describe("List View Auto Scroll", () => {
  test("scrolls to today date section when today has events", async ({ page }) => {
    const today = new Date()
    const todayDateKey = formatDateKey(today)
    const tomorrowDateKey = formatDateKey(addDays(today, 1))
    const pastEvents = buildPastEventsInCurrentMonth(today, "Past Event")

    const events: MockEvent[] = [
      ...pastEvents,
      buildEvent("today", "Today Target Event", todayDateKey),
      buildEvent("future", "Future Event", tomorrowDateKey),
    ]

    await mockEvents(page, events)
    await page.goto("/?view=list")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(600)

    await expect(page.getByText("Today Target Event")).toBeVisible()

    const scrollTop = await getListScrollTop(page)
    if (today.getDate() > 1) {
      expect(scrollTop).toBeGreaterThan(0)
    }
  })

  test("scrolls to next upcoming date section when today has no events", async ({ page }) => {
    const today = new Date()
    const nextDateKey = formatDateKey(addDays(today, 2))
    const anotherFutureDateKey = formatDateKey(addDays(today, 5))
    const pastEvents = buildPastEventsInCurrentMonth(today, "Past Event")

    const events: MockEvent[] = [
      ...pastEvents,
      buildEvent("next", "Fallback Next Event", nextDateKey),
      buildEvent("future", "Future Event", anotherFutureDateKey),
    ]

    await mockEvents(page, events)
    await page.goto("/?view=list")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(600)

    await expect(page.getByText("Fallback Next Event")).toBeVisible()

    const scrollTop = await getListScrollTop(page)
    if (today.getDate() > 1) {
      expect(scrollTop).toBeGreaterThan(0)
    }
  })
})
