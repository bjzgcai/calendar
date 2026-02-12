import { NextRequest, NextResponse } from "next/server";
import { eventManager } from "@/storage/database/eventManager";
import { getOrganizationType } from "@/storage/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await eventManager.getEventById(parseInt(id));

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 处理时间字段
    let startTime, endTime;
    if (body.startTime && body.endTime) {
      // 优先使用前端已转换的 ISO 时间字符串
      startTime = new Date(body.startTime);
      endTime = new Date(body.endTime);
    } else if (body.date && body.startHour && body.endHour) {
      // 兼容新格式的时间字段（date + startHour/endHour）
      startTime = new Date(`${body.date}T${body.startHour}:00`);
      endTime = new Date(`${body.date}T${body.endHour}:00`);
    } else {
      return NextResponse.json({ error: "Missing time information" }, { status: 400 });
    }

    // organizer is now a comma-separated string, get the primary organizer for type
    const primaryOrganizer = body.organizer ? body.organizer.split(',')[0]?.trim() : null;

    const updatedEvent = await eventManager.updateEvent(parseInt(id), {
      title: body.title,
      content: body.content || null,
      imageUrl: body.imageUrl,
      link: body.link,
      startTime,
      endTime,
      location: body.location,
      organizer: body.organizer || null, // Keep as comma-separated string or null
      organizationType: primaryOrganizer ? getOrganizationType(primaryOrganizer) : 'other',
      eventType: body.eventType !== undefined ? body.eventType : undefined,
      tags: body.tags,
      recurrenceRule: body.recurrenceRule,
      recurrenceEndDate: body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null,
      datePrecision: body.datePrecision || undefined,
      approximateMonth: body.approximateMonth || null,
    });

    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await eventManager.deleteEvent(parseInt(id));

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
