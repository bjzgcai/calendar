export const DEFAULT_POSTER_AI_MODEL = "black-forest-labs/flux.2-max"

type PosterAiEnv = {
  POSTER_AI_MODEL?: string
}

type PosterEvent = {
  title: string
  startTime: string | Date
  location?: string | null
  organizer?: string | null
  eventType?: string | null
}

type BuildImagePosterSvgInput = {
  backgroundDataUrl: string
  dateRange: string
  generatedDate: string
  events: PosterEvent[]
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  academic_research: "学术研究",
  teaching_training: "教学培训",
  student_activities: "学生活动",
  industry_academia: "产学研",
  administration: "行政",
  important_deadlines: "重要节点",
}

export function resolvePosterAiModel(
  env: PosterAiEnv = { POSTER_AI_MODEL: process.env.POSTER_AI_MODEL }
): string {
  return env.POSTER_AI_MODEL?.trim() || DEFAULT_POSTER_AI_MODEL
}

export function buildPosterAiRequestBody(prompt: string, env?: PosterAiEnv) {
  const model = resolvePosterAiModel(env)

  return {
    model,
    messages: [{ role: "user", content: prompt }],
    modalities: resolvePosterAiModalities(model),
    image_config: {
      aspect_ratio: "2:3",
      image_size: "2K",
    },
  }
}

function resolvePosterAiModalities(model: string): string[] {
  return model.startsWith("black-forest-labs/flux") ? ["image"] : ["image", "text"]
}

export function extractPosterImageDataUrl(response: unknown): string | null {
  const message = getRecord(response)?.choices;
  const firstChoice = Array.isArray(message) ? getRecord(message[0]) : null;
  const choiceMessage = getRecord(firstChoice?.message);

  const images = choiceMessage?.images;
  if (Array.isArray(images)) {
    for (const image of images) {
      const url = findImageUrl(image);
      if (url) return url;
    }
  }

  const content = choiceMessage?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const url = findImageUrl(part);
      if (url) return url;
    }
  }

  if (typeof content === "string") {
    const match = content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
    return match?.[0] || null;
  }

  return null
}

export function buildImagePosterSvg({
  backgroundDataUrl,
  dateRange,
  generatedDate,
  events,
}: BuildImagePosterSvgInput): string {
  const shownEvents = events.slice(0, 12)
  const cardHeight = shownEvents.length <= 4 ? 106 : shownEvents.length <= 8 ? 78 : 56
  const titleSize = shownEvents.length <= 4 ? 18 : shownEvents.length <= 8 ? 15 : 12
  const metaSize = shownEvents.length <= 4 ? 12 : shownEvents.length <= 8 ? 10 : 8
  const gap = shownEvents.length <= 8 ? 10 : 6
  const firstY = shownEvents.length <= 4 ? 250 : 210

  const eventMarkup = shownEvents.length
    ? shownEvents
        .map((event, index) => {
          const y = firstY + index * (cardHeight + gap)
          const start = new Date(event.startTime)
          const meta = [
            formatDate(start),
            formatTime(start),
            event.location,
            event.organizer,
          ].filter(Boolean)
          const typeLabel = eventTypeLabel(event.eventType)

          return `<g clip-path="url(#cardClip${index})">
    <rect x="46" y="${y}" width="508" height="${cardHeight}" rx="10" fill="rgba(255,255,255,0.76)" stroke="rgba(46,72,62,0.22)" />
    <text x="66" y="${y + 25}" font-size="${metaSize}" font-weight="800" fill="#3b6d56">${escapeSvg(typeLabel || "活动")}</text>
    <text x="66" y="${y + 52}" font-size="${titleSize}" font-weight="900" fill="#17342a">${escapeSvg(truncate(event.title, shownEvents.length > 8 ? 28 : 36))}</text>
    <text x="66" y="${y + cardHeight - 18}" font-size="${metaSize}" font-weight="650" fill="#4c6258">${escapeSvg(truncate(meta.join(" · "), 52))}</text>
  </g>
  <clipPath id="cardClip${index}"><rect x="46" y="${y}" width="508" height="${cardHeight}" rx="10" /></clipPath>`
        })
        .join("\n")
    : `<g>
    <rect x="70" y="360" width="460" height="140" rx="16" fill="rgba(255,255,255,0.72)" stroke="rgba(46,72,62,0.22)" />
    <text x="300" y="420" text-anchor="middle" font-size="30" font-weight="900" fill="#17342a">暂无活动</text>
    <text x="300" y="462" text-anchor="middle" font-size="17" font-weight="650" fill="#557064">当前时间范围内没有已入库日程</text>
  </g>`

  return `<svg width="600" height="900" viewBox="0 0 600 900" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="posterClip"><rect width="600" height="900" /></clipPath>
  <linearGradient id="wash" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#fffdf5" stop-opacity="0.52" />
    <stop offset="0.48" stop-color="#fffdf5" stop-opacity="0.18" />
    <stop offset="1" stop-color="#fffdf5" stop-opacity="0.62" />
  </linearGradient>
</defs>
<g clip-path="url(#posterClip)" font-family="'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'WenQuanYi Micro Hei', sans-serif">
  <image href="${escapeSvg(backgroundDataUrl)}" x="0" y="0" width="600" height="900" preserveAspectRatio="xMidYMid slice" />
  <rect width="600" height="900" fill="url(#wash)" />
  <rect x="34" y="34" width="532" height="832" rx="18" fill="rgba(255,255,248,0.22)" stroke="rgba(36,83,65,0.24)" />
  <text x="58" y="92" font-size="19" font-weight="800" fill="#59725f">中关村学院</text>
  <text x="58" y="142" font-size="40" font-weight="900" fill="#153328">活动日历</text>
  <text x="58" y="180" font-size="22" font-weight="750" fill="#315846">${escapeSvg(dateRange)}</text>
  ${eventMarkup}
  <line x1="58" y1="810" x2="542" y2="810" stroke="rgba(36,83,65,0.24)" stroke-width="1.5" />
  <text x="58" y="842" font-size="14" font-weight="750" fill="#3d5f4f">生成日期：${escapeSvg(generatedDate)}</text>
  <text x="542" y="842" text-anchor="end" font-size="14" font-weight="750" fill="#3d5f4f">中关村学院</text>
</g>
</svg>`
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function findImageUrl(value: unknown): string | null {
  const record = getRecord(value)
  if (!record) return null
  const directUrl = record.url
  if (typeof directUrl === "string" && directUrl.startsWith("data:image/")) return directUrl

  const imageUrl = getRecord(record.image_url)?.url
  if (typeof imageUrl === "string" && imageUrl.startsWith("data:image/")) return imageUrl

  return null
}

function eventTypeLabel(eventType: string | null | undefined): string {
  if (!eventType) return ""
  const key = eventType.split(",")[0]?.trim()
  return key ? EVENT_TYPE_LABELS[key] || key : ""
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date)
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value
}

function escapeSvg(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
