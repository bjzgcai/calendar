import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const POSTERS_DIR = process.env.POSTERS_STORAGE_PATH || path.join(process.cwd(), "storage", "posters");

const VALID_EVENT_TYPES = new Set([
  "academic_research",
  "teaching_training",
  "student_activities",
  "industry_academia",
  "administration",
  "important_deadlines",
]);

type ParsedEvent = {
  title: string;
  content: string | null;
  date: string;
  location: string | null;
  organizer: string | null;
  eventType: string | null;
  tags: string;
  link: string | null;
  imageUrl: string | null;
};

type RawParsedEvent = {
  title?: unknown;
  content?: unknown;
  date?: unknown;
  location?: unknown;
  organizers?: unknown;
  eventType?: unknown;
  tags?: unknown;
  link?: unknown;
  imageIndex?: unknown;
};

const CURRENT_YEAR = new Date().getFullYear();

const VAGUE_EVENT_KEYWORDS = [
  "待定",
  "另行通知",
  "春季学期",
  "夏送清凉",
  "冬送温暖",
  "住院、婚丧嫁娶慰问",
  "住院",
  "婚丧嫁娶慰问",
  "公园年票发放",
];

function isValidDateParts(year: number, month: number, day: number): boolean {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() + 1 === month &&
    utcDate.getUTCDate() === day
  );
}

function hasExplicitYearInInput(text: string): boolean {
  return /(?:19|20)\d{2}/.test(text);
}

function coerceToCurrentYearWhenYearIsImplicit(date: string, sourceHasExplicitYear: boolean): string {
  if (sourceHasExplicitYear) return date;

  const exactMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!exactMatch) return date;

  const month = Number(exactMatch[2]);
  const day = Number(exactMatch[3]);
  if (!isValidDateParts(CURRENT_YEAR, month, day)) return date;

  return `${CURRENT_YEAR}-${exactMatch[2]}-${exactMatch[3]}`;
}

function normalizeTags(tags: unknown): string {
  if (!Array.isArray(tags)) return "";

  return tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .map((tag) => {
      let normalized = tag;
      if (!normalized.startsWith("#")) normalized = `#${normalized}`;
      if (!normalized.endsWith("#")) normalized = `${normalized}#`;
      return normalized;
    })
    .join(" ");
}

function normalizeDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  const exactMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exactMatch) {
    const year = Number(exactMatch[1]);
    const month = Number(exactMatch[2]);
    const day = Number(exactMatch[3]);
    if (!isValidDateParts(year, month, day)) return null;
    return `${exactMatch[1]}-${exactMatch[2]}-${exactMatch[3]}`;
  }

  // 支持 MM-DD / M-D -> 当年-MM-DD
  const monthDayHyphenMatch = value.match(/^(\d{1,2})-(\d{1,2})$/);
  if (monthDayHyphenMatch) {
    const month = Number(monthDayHyphenMatch[1]);
    const day = Number(monthDayHyphenMatch[2]);
    if (!isValidDateParts(CURRENT_YEAR, month, day)) return null;
    return `${CURRENT_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // 支持 M月D日 -> 当年-MM-DD
  const monthDayChineseMatch = value.match(/^(\d{1,2})月\s*(\d{1,2})日?$/);
  if (monthDayChineseMatch) {
    const month = Number(monthDayChineseMatch[1]);
    const day = Number(monthDayChineseMatch[2]);
    if (!isValidDateParts(CURRENT_YEAR, month, day)) return null;
    return `${CURRENT_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // 支持 YYYY-MM -> YYYY-MM-15（如 2026-03）
  const yearMonthHyphenMatch = value.match(/^(\d{4})-(\d{2})$/);
  if (yearMonthHyphenMatch) {
    const year = Number(yearMonthHyphenMatch[1]);
    const month = Number(yearMonthHyphenMatch[2]);
    if (!isValidDateParts(year, month, 15)) return null;
    return `${yearMonthHyphenMatch[1]}-${yearMonthHyphenMatch[2]}-15`;
  }

  // 支持 YYYY年MM月(上旬/下旬/某周/中旬/暂定 等) -> YYYY-MM-15
  const yearMonthChineseMatch = value.match(/^(\d{4})年\s*(\d{1,2})月(?:上旬|中旬|下旬|某周|第[一二三四五六七]周|暂定)?$/);
  if (yearMonthChineseMatch) {
    const year = yearMonthChineseMatch[1];
    const month = String(Number(yearMonthChineseMatch[2])).padStart(2, "0");
    if (Number(month) >= 1 && Number(month) <= 12) {
      return `${year}-${month}-15`;
    }
  }

  // 支持 3月上旬 / 3月下旬 / 3月某周 / 暂定3月 等 -> 当年-03-15
  const monthOnlyMatch = value.match(/^(?:暂定\s*)?(\d{1,2})月(?:上旬|中旬|下旬|某周|第[一二三四五六七]周|暂定)?$/);
  if (monthOnlyMatch) {
    const month = Number(monthOnlyMatch[1]);
    if (month >= 1 && month <= 12) {
      return `${CURRENT_YEAR}-${String(month).padStart(2, "0")}-15`;
    }
  }

  return null;
}

function hasExplicitMonthOrDate(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const value = input.trim();
  if (!value) return false;

  return (
    /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.test(value) ||
    /^(\d{4})年\s*(\d{1,2})月/.test(value) ||
    /(\d{1,2})月/.test(value)
  );
}

function shouldIgnoreVagueEvent(raw: RawParsedEvent, title: string, content: string | null): boolean {
  const combined = `${title} ${content ?? ""}`;
  const matchedKeyword = VAGUE_EVENT_KEYWORDS.some((keyword) => combined.includes(keyword));
  if (!matchedKeyword) return false;

  // 对于这类“长期/事项类”描述，仅当原始日期明确到月份或日期时才保留
  return !hasExplicitMonthOrDate(raw.date);
}

async function toModelImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith("/api/posters/")) {
    return imageUrl;
  }

  const filename = imageUrl.split("/api/posters/")[1];
  const filePath = path.join(POSTERS_DIR, filename);
  const fileBuffer = await readFile(filePath);
  const base64Image = fileBuffer.toString("base64");
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  const mimeType = mimeTypes[ext] || "image/jpeg";
  return `data:${mimeType};base64,${base64Image}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const sourceHasExplicitYear = hasExplicitYearInInput(text);
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url: unknown) => typeof url === "string").slice(0, 10)
      : [];

    if (!text && imageUrls.length === 0) {
      return NextResponse.json({ error: "Text or images are required" }, { status: 400 });
    }

    const modelImageUrls = await Promise.all(imageUrls.map((url: string) => toModelImageUrl(url)));

    const imageBlocks = modelImageUrls.map((url) => ({
      type: "image_url",
      image_url: { url },
    }));

    const userPrompt = `请根据我提供的文本和图片，提取活动信息并返回 JSON。

要求：
1. 返回格式必须是：
{
  "events": [
    {
      "title": "活动标题",
      "content": "活动描述",
      "date": "YYYY-MM-DD 或 YYYY-MM 或 月份表达（如 3月上旬/下旬/某周/暂定3月）",
      "location": "地点",
      "organizers": ["组织者1", "组织者2"],
      "eventType": "academic_research | teaching_training | student_activities | industry_academia | administration | important_deadlines | null",
      "tags": ["#标签1#", "#标签2#"],
      "link": "https://example.com",
      "imageIndex": 0
    }
  ]
}
2. 如果能精确到日，date 用 YYYY-MM-DD。
3. 如果原文没有明确年份（如“3月3日”“3月上旬”），一律按当前年份 ${CURRENT_YEAR} 输出；不要猜测成往年。
4. 如果日期只到月份或属于“3月上旬/下旬/某周/暂定3月/2026-03”等表达，date 返回该月（建议 YYYY-MM）；系统会统一转换为当月15号。
5. 对“待定/另行通知/春季学期/夏送清凉/冬送温暖/住院婚丧嫁娶慰问/公园年票发放”等事项，若无法定位到具体月份，直接忽略不返回。
6. imageIndex 表示关联哪一张图片（从0开始）；如果无法关联可填 null。
7. 只返回 JSON，不要返回任何其他文字。

用户文本：
${text || "(无文本，仅图片)"}`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": request.headers.get("origin") || "",
        "X-Title": "Event Calendar System - Batch Parse",
      },
      body: JSON.stringify({
        model: "qwen/qwen-vl-plus",
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text: userPrompt,
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: "Failed to parse events", details: error }, { status: response.status });
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return NextResponse.json({ error: "No response from AI model" }, { status: 500 });
    }

    let parsed: { events?: unknown[] };
    try {
      const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(messageContent);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          rawResponse: messageContent,
        },
        { status: 500 }
      );
    }

    const rawEvents = Array.isArray(parsed.events) ? parsed.events : [];

    const events: ParsedEvent[] = rawEvents
      .map((item: unknown) => {
        const raw = (item && typeof item === "object" ? item : {}) as RawParsedEvent;
        const title = typeof raw.title === "string" ? raw.title.trim() : "";
        if (!title) return null;
        const content = typeof raw.content === "string" ? raw.content.trim() || null : null;
        if (shouldIgnoreVagueEvent(raw, title, content)) return null;

        const normalizedDate = normalizeDate(raw.date);
        if (!normalizedDate) return null;
        const date = coerceToCurrentYearWhenYearIsImplicit(normalizedDate, sourceHasExplicitYear);

        const normalizedEventType =
          typeof raw.eventType === "string" && VALID_EVENT_TYPES.has(raw.eventType)
            ? raw.eventType
            : null;

        const imageIndex = typeof raw.imageIndex === "number" ? raw.imageIndex : null;
        const imageUrl =
          imageIndex !== null && imageIndex >= 0 && imageIndex < imageUrls.length ? imageUrls[imageIndex] : null;

        let organizer: string | null = null;
        if (Array.isArray(raw.organizers)) {
          const organizers = raw.organizers
            .map((org: unknown) => (typeof org === "string" ? org.trim() : ""))
            .filter(Boolean);
          organizer = organizers.length > 0 ? organizers.join(",") : null;
        }

        return {
          title,
          content,
          date,
          location: typeof raw.location === "string" ? raw.location.trim() || null : null,
          organizer,
          eventType: normalizedEventType,
          tags: normalizeTags(raw.tags),
          link: typeof raw.link === "string" ? raw.link.trim() || null : null,
          imageUrl,
        };
      })
      .filter((event): event is ParsedEvent => Boolean(event));

    return NextResponse.json({
      success: true,
      events,
      rawResponse: messageContent,
    });
  } catch (error) {
    console.error("Error batch parsing events:", error);
    return NextResponse.json(
      {
        error: "Failed to batch parse events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
