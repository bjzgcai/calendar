import { NextRequest, NextResponse } from "next/server";
import { eventManager } from "@/storage/database/eventManager";
import { addDays, addWeeks, addMonths, isWeekend } from "date-fns";
import type { Event } from "@/storage/database";
import { EVENT_TYPE_COLORS, getEventTypeColor, getOrganizationType } from "@/storage/database";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const eventType = searchParams.get("eventType");
    const organizer = searchParams.get("organizer");
    const tags = searchParams.get("tags");
    const myEvents = searchParams.get("myEvents") === "true";

    // 如果请求只查看"我的活动"，则获取当前用户的 ID 并过滤
    let creatorId: number | null | undefined = undefined;
    if (myEvents) {
      const session = await getSession();
      if (session.isLoggedIn && session.userId) {
        creatorId = session.userId;
      }
    }

    const events = await eventManager.getAllEvents({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      eventType: eventType || undefined,
      organizer: organizer || undefined,
      tags: tags || undefined,
      creatorId,
    });

    // 转换为 FullCalendar 格式
    const calendarEvents = events.map((event: Event) => {
      // Get primary event type for background color (first in comma-separated list)
      const primaryEventType = event.eventType ? event.eventType.split(',')[0]?.trim() : null

      // 检测是否为全天事件
      const startDate = new Date(event.startTime);
      const endDate = new Date(event.endTime);

      // 判断是否为全天事件：开始时间为 00:00，结束时间为 23:59 或第二天的 00:00
      const isAllDay = (
        startDate.getHours() === 0 &&
        startDate.getMinutes() === 0 &&
        startDate.getSeconds() === 0 &&
        (
          (endDate.getHours() === 23 && endDate.getMinutes() === 59) ||
          (endDate.getHours() === 0 && endDate.getMinutes() === 0 && endDate.getDate() !== startDate.getDate())
        )
      );

      return {
        id: event.id.toString(),
        title: event.title,
        start: event.startTime.toISOString(),
        end: event.endTime.toISOString(),
        allDay: isAllDay,
        backgroundColor: getEventTypeColor(primaryEventType as any).calendarBg,
        datePrecision: (event as any).datePrecision || "exact",
        approximateMonth: (event as any).approximateMonth || null,
        extendedProps: {
          content: event.content,
          imageUrl: event.imageUrl,
          link: event.link,
          location: event.location,
          organizer: event.organizer,
          organizationType: event.organizationType,
          eventType: event.eventType,
          tags: event.tags,
          recurrenceRule: event.recurrenceRule,
          datePrecision: (event as any).datePrecision || "exact",
          approximateMonth: (event as any).approximateMonth || null,
          requiredAttendees: (event as any).requiredAttendees || null,
        },
      }
    });

    return NextResponse.json(calendarEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取当前登录用户的 ID
    const session = await getSession();
    const creatorId = session.isLoggedIn && session.userId ? session.userId : null;

    // 如果传入了 date, startHour, endHour，则构建 startTime 和 endTime
    const startTime = body.date && body.startHour
      ? new Date(`${body.date}T${body.startHour}:00`).toISOString()
      : body.startTime;

    const endTime = body.date && body.endHour
      ? new Date(`${body.date}T${body.endHour}:00`).toISOString()
      : body.endTime;

    // 创建主活动（根据发起者自动判断机构类型）
    // organizer is now a comma-separated string, get the primary organizer for type
    const primaryOrganizer = body.organizer ? body.organizer.split(',')[0]?.trim() : null;

    const newEvent = await eventManager.createEvent({
      title: body.title,
      content: body.content || null,
      imageUrl: body.imageUrl || null,
      link: body.link || null,
      startTime,
      endTime,
      location: body.location || null,
      organizer: body.organizer || null, // Keep as comma-separated string or null
      organizationType: primaryOrganizer ? getOrganizationType(primaryOrganizer) : 'other',
      eventType: body.eventType || null,
      tags: body.tags || "",
      recurrenceRule: body.recurrenceRule || "none",
      recurrenceEndDate: body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null,
      datePrecision: body.datePrecision || "exact",
      approximateMonth: body.approximateMonth || null,
      requiredAttendees: body.requiredAttendees || null,
      creatorId: creatorId,
    });

    // 如果有重复规则，生成重复活动
    if (body.recurrenceRule && body.recurrenceRule !== "none" && body.recurrenceEndDate) {
      const startDate = new Date(body.startTime);
      const endDate = new Date(body.endTime);
      const recurrenceEndDate = new Date(body.recurrenceEndDate);
      const duration = endDate.getTime() - startDate.getTime();

      let currentDate = startDate;
      const createdEvents = [newEvent];

      while (currentDate.getTime() < recurrenceEndDate.getTime()) {
        let nextDate: Date;

        switch (body.recurrenceRule) {
          case "daily":
            // 每个工作日
            nextDate = addDays(currentDate, 1);
            // 跳过周末
            while (isWeekend(nextDate)) {
              nextDate = addDays(nextDate, 1);
            }
            break;
          case "weekly":
            nextDate = addWeeks(currentDate, 1);
            break;
          case "monthly":
            nextDate = addMonths(currentDate, 1);
            break;
          default:
            nextDate = currentDate;
        }

        if (nextDate.getTime() >= recurrenceEndDate.getTime()) {
          break;
        }

        const nextStartTime = new Date(nextDate);
        const nextEndTime = new Date(nextDate.getTime() + duration);

        const repeatedEvent = await eventManager.createEvent({
          title: body.title,
          content: body.content || null,
          imageUrl: body.imageUrl || null,
          link: body.link || null,
          startTime: nextStartTime,
          endTime: nextEndTime,
          location: body.location || null,
          organizer: body.organizer || null, // Keep as comma-separated string or null
          organizationType: primaryOrganizer ? getOrganizationType(primaryOrganizer) : 'other',
          eventType: body.eventType || null,
          tags: body.tags || "",
          recurrenceRule: body.recurrenceRule || "none",
          recurrenceEndDate: body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null,
          datePrecision: body.datePrecision || "exact",
          approximateMonth: body.approximateMonth || null,
          requiredAttendees: body.requiredAttendees || null,
          creatorId: creatorId,
        });

        createdEvents.push(repeatedEvent);
        currentDate = nextDate;
      }

      return NextResponse.json({ events: createdEvents, count: createdEvents.length }, { status: 201 });
    }

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
