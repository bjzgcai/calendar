import { NextRequest, NextResponse } from "next/server";
import { eventManager } from "@/storage/database/eventManager";
import { addDays, addWeeks, addMonths, isWeekend } from "date-fns";
import type { Event } from "@/storage/database";
import { getOrganizationType } from "@/storage/database";
import { getClientIp } from "@/lib/get-client-ip";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const organizer = searchParams.get("organizer");
    const tags = searchParams.get("tags");
    const myEvents = searchParams.get("myEvents") === "true";

    // 如果请求只查看"我的活动"，则获取当前用户的 IP 并过滤
    let creatorIp: string | null | undefined = undefined;
    if (myEvents) {
      creatorIp = getClientIp(request);
    }

    const events = await eventManager.getAllEvents({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      organizer: organizer || undefined,
      tags: tags || undefined,
      creatorIp,
    });

    // 转换为 FullCalendar 格式
    const calendarEvents = events.map((event: Event) => ({
      id: event.id.toString(),
      title: event.title,
      start: event.startTime.toISOString(),
      end: event.endTime.toISOString(),
      backgroundColor: event.organizationType === "center" ? "#3b82f6" :
                      event.organizationType === "club" ? "#22c55e" :
                      "#a855f7",
      extendedProps: {
        content: event.content,
        imageUrl: event.imageUrl,
        link: event.link,
        location: event.location,
        organizer: event.organizer,
        organizationType: event.organizationType,
        tags: event.tags,
        recurrenceRule: event.recurrenceRule,
      },
    }));

    return NextResponse.json(calendarEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取创建者的 IP 地址
    const creatorIp = getClientIp(request);

    // 如果传入了 date, startHour, endHour，则构建 startTime 和 endTime
    const startTime = body.date && body.startHour
      ? new Date(`${body.date}T${body.startHour}:00`).toISOString()
      : body.startTime;

    const endTime = body.date && body.endHour
      ? new Date(`${body.date}T${body.endHour}:00`).toISOString()
      : body.endTime;

    // 创建主活动（根据发起者自动判断机构类型）
    const newEvent = await eventManager.createEvent({
      title: body.title,
      content: body.content,
      imageUrl: body.imageUrl || null,
      link: body.link || null,
      startTime,
      endTime,
      location: body.location || null,
      organizer: body.organizer,
      organizationType: getOrganizationType(body.organizer),
      tags: body.tags || "",
      recurrenceRule: body.recurrenceRule || "none",
      recurrenceEndDate: body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null,
      creatorIp: creatorIp || null,
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
          content: body.content,
          imageUrl: body.imageUrl || null,
          link: body.link || null,
          startTime: nextStartTime,
          endTime: nextEndTime,
          location: body.location || null,
          organizer: body.organizer,
          organizationType: getOrganizationType(body.organizer),
          tags: body.tags || "",
          recurrenceRule: body.recurrenceRule || "none",
          recurrenceEndDate: body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null,
          creatorIp: creatorIp || null,
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
