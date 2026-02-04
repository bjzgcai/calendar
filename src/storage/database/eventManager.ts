import { eq, and, SQL, gte, lte, like } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { events, insertEventWithCoercionSchema, updateEventWithCoercionSchema } from "./shared/schema";
import type { Event, InsertEvent, UpdateEvent } from "./shared/schema";

export class EventManager {
  async createEvent(data: InsertEvent): Promise<Event> {
    const db = await getDb();
    const validated = insertEventWithCoercionSchema.parse(data);
    const [event] = await db.insert(events).values(validated).returning();
    return event;
  }

  async getAllEvents(options?: {
    skip?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    organizer?: string;
    tags?: string;
    creatorIp?: string | null;
  }): Promise<Event[]> {
    const { skip = 0, limit = 100, startDate, endDate, organizer, tags, creatorIp } = options || {};
    const db = await getDb();

    const conditions: SQL[] = [];

    if (startDate) {
      conditions.push(gte(events.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.endTime, endDate));
    }
    if (organizer) {
      conditions.push(eq(events.organizer, organizer));
    }
    if (tags) {
      // Support multiple tags separated by comma (AND logic)
      const tagList = tags.split(',').filter(t => t.trim());
      tagList.forEach(tag => {
        conditions.push(like(events.tags, `%${tag.trim()}%`));
      });
    }
    if (creatorIp !== undefined) {
      conditions.push(eq(events.creatorIp, creatorIp));
    }

    const query = db.select().from(events);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return query.orderBy(events.startTime).limit(limit).offset(skip);
  }

  async getEventById(id: number): Promise<Event | null> {
    const db = await getDb();
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || null;
  }

  async updateEvent(id: number, data: UpdateEvent): Promise<Event | null> {
    const db = await getDb();
    const validated = updateEventWithCoercionSchema.parse(data);
    const [event] = await db
      .update(events)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event || null;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getOrganizers(): Promise<string[]> {
    const db = await getDb();
    const result = await db
      .selectDistinct({ organizer: events.organizer })
      .from(events)
      .orderBy(events.organizer);
    return result.map((r) => r.organizer);
  }

  async getTags(): Promise<string[]> {
    const db = await getDb();
    const allEvents = await db.select({ tags: events.tags }).from(events);
    const tagSet = new Set<string>();
    allEvents.forEach((event) => {
      const tags = event.tags.match(/#[^#\s]+/g) || [];
      tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  async getTagsWithCounts(): Promise<{ name: string; count: number }[]> {
    const db = await getDb();
    const allEvents = await db.select({ tags: events.tags }).from(events);
    const tagMap = new Map<string, number>();

    allEvents.forEach((event) => {
      const tags = event.tags.match(/#[^#]+#/g) || [];
      tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }
}

export const eventManager = new EventManager();
