import assert from "node:assert/strict"
import test from "node:test"

import {
  buildImagePosterSvg,
  buildPosterAiRequestBody,
  buildPosterDateWindow,
  DEFAULT_POSTER_AI_API_URL,
  DEFAULT_POSTER_AI_MODEL,
  extractPosterImageDataUrl,
  formatPosterDateRange,
  MAX_POSTER_EVENTS,
  resolvePosterAiModel,
} from "../../src/lib/poster-ai"

test("poster AI model defaults to the OpenRouter image model", () => {
  assert.equal(DEFAULT_POSTER_AI_API_URL, "https://openrouter.ihainan.me/api/v1/chat/completions")
  assert.equal(DEFAULT_POSTER_AI_MODEL, "openai/gpt-5.4-image-2")
  assert.equal(resolvePosterAiModel({}), "openai/gpt-5.4-image-2")
})

test("poster AI model can be overridden without accepting blank env values", () => {
  assert.equal(
    resolvePosterAiModel({ POSTER_AI_MODEL: " anthropic/claude-sonnet-4.5 " }),
    "anthropic/claude-sonnet-4.5"
  )
  assert.equal(
    resolvePosterAiModel({ POSTER_AI_MODEL: "   " }),
    DEFAULT_POSTER_AI_MODEL
  )
})

test("poster AI request asks OpenRouter for image output", () => {
  assert.deepEqual(buildPosterAiRequestBody("生成背景", { POSTER_AI_MODEL: "openai/gpt-5.4-image-2" }), {
    model: "openai/gpt-5.4-image-2",
    messages: [{ role: "user", content: "生成背景" }],
    modalities: ["image", "text"],
    image_config: {
      aspect_ratio: "2:3",
      image_size: "2K",
    },
  })
})

test("extractPosterImageDataUrl accepts OpenRouter image response shapes", () => {
  const dataUrl = "data:image/png;base64,abc123"

  assert.equal(
    extractPosterImageDataUrl({
      choices: [{ message: { images: [{ image_url: { url: dataUrl } }] } }],
    }),
    dataUrl
  )

  assert.equal(
    extractPosterImageDataUrl({
      choices: [{ message: { content: [{ image_url: { url: dataUrl } }] } }],
    }),
    dataUrl
  )

  assert.equal(
    extractPosterImageDataUrl({
      choices: [{ message: { content: `generated ${dataUrl}` } }],
    }),
    dataUrl
  )
})

test("buildImagePosterSvg embeds generated image and escapes event text", () => {
  const svg = buildImagePosterSvg({
    backgroundDataUrl: "data:image/png;base64,abc123",
    dateRange: "2026年4月",
    generatedDate: "2026年4月28日",
    events: [
      {
        title: "AI & <安全> 讲座",
        startTime: "2026-04-28T09:30:00+08:00",
        location: "A座",
        organizer: "中关村学院",
        eventType: "academic_research",
      },
    ],
  })

  assert.match(svg, /^<svg /)
  assert.match(svg, /<image href="data:image\/png;base64,abc123"/)
  assert.match(svg, /AI &amp; &lt;安全&gt; 讲座/)
  assert.match(svg, /学术研究/)
  assert.match(svg, /2026年4月/)
})

test("buildPosterDateWindow starts at the current moment", () => {
  const { startDate, endDate } = buildPosterDateWindow(new Date("2026-04-28T10:15:00+08:00"))

  assert.equal(startDate.toISOString(), new Date("2026-04-28T10:15:00+08:00").toISOString())
  assert.equal(endDate.toISOString(), new Date("2026-05-12T23:59:59.999+08:00").toISOString())
  assert.equal(formatPosterDateRange(startDate, endDate), "2026年4月28日 至 5月12日")
})

test("buildImagePosterSvg excludes events with repeat rules", () => {
  const svg = buildImagePosterSvg({
    backgroundDataUrl: "data:image/png;base64,abc123",
    dateRange: "2026年4月28日 至 5月12日",
    generatedDate: "2026年4月28日",
    events: [
      {
        title: "不重复活动",
        startTime: "2026-04-28T09:30:00+08:00",
        recurrenceRule: "none",
      },
      {
        title: "每周重复活动",
        startTime: "2026-04-29T09:30:00+08:00",
        recurrenceRule: "weekly",
      },
    ],
  })

  assert.match(svg, /不重复活动/)
  assert.doesNotMatch(svg, /每周重复活动/)
})

test("buildImagePosterSvg limits poster events to the fixed poster cap", () => {
  const events = Array.from({ length: MAX_POSTER_EVENTS + 3 }, (_, index) => ({
    title: `活动 ${index + 1}`,
    startTime: new Date(Date.UTC(2026, 3, 28 + index, 1, 30)).toISOString(),
  }))

  const svg = buildImagePosterSvg({
    backgroundDataUrl: "data:image/png;base64,abc123",
    dateRange: "2026年4月28日 至 5月12日",
    generatedDate: "2026年4月28日",
    events,
  })

  assert.equal(MAX_POSTER_EVENTS, 10)
  assert.match(svg, /活动 10/)
  assert.doesNotMatch(svg, /活动 11/)
})
