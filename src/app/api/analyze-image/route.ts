import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const POSTERS_DIR = process.env.POSTERS_STORAGE_PATH || path.join(process.cwd(), "storage", "posters");

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    // For local images (relative URLs), convert to base64
    let imageDataUrl = imageUrl;
    if (imageUrl.startsWith("/api/posters/")) {
      try {
        // Extract filename from URL
        const filename = imageUrl.split("/api/posters/")[1];
        const filePath = path.join(POSTERS_DIR, filename);

        // Read file and convert to base64
        const fileBuffer = await readFile(filePath);
        const base64Image = fileBuffer.toString("base64");

        // Determine mime type from extension
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
        };
        const mimeType = mimeTypes[ext] || "image/jpeg";

        imageDataUrl = `data:${mimeType};base64,${base64Image}`;
      } catch (error) {
        console.error("Failed to read local image file:", error);
        return NextResponse.json(
          { error: "Failed to read image file" },
          { status: 500 }
        );
      }
    }

    // Call Qwen VL Plus via OpenRouter
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": request.headers.get("origin") || "",
        "X-Title": "Event Calendar System",
      },
      body: JSON.stringify({
        model: "qwen/qwen-vl-plus",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
              {
                type: "text",
                text: `请分析这张活动海报或图片，提取以下信息（如果图片中没有某些信息，请返回 null）：

1. 活动标题
2. 活动内容/描述
3. 活动日期（YYYY-MM-DD格式，如果只有月份返回 YYYY-MM）
4. 开始时间（HH:MM格式，24小时制）
5. 结束时间（HH:MM格式，24小时制）
6. 活动地点
7. 主办方/发起者（可能是多个，用逗号分隔。常见的有：创新创业中心、国际交流中心、学生事务中心、教学支持中心、智慧学习中心、生活服务中心、行政管理中心、学生社团、其他）
8. 活动类型（从以下选择最匹配的：学术研究、教学培训、学生活动、产学研合作、行政管理、重要截止）
9. 相关标签（用 # 包裹，例如：#讲座# #直播#）
10. 活动链接/报名链接

请以 JSON 格式返回，格式如下：
{
  "title": "活动标题",
  "content": "活动详细描述",
  "date": "2024-03-15",
  "startTime": "14:00",
  "endTime": "16:00",
  "location": "会议室A",
  "organizers": ["创新创业中心", "学生社团"],
  "eventType": "学术研究",
  "tags": ["#讲座#", "#直播#"],
  "link": "https://example.com",
  "datePrecision": "exact"
}

如果只能确定月份，请设置 datePrecision 为 "month"，date 设为 YYYY-MM 格式。
如果可以确定具体日期，请设置 datePrecision 为 "exact"。`,
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      return NextResponse.json(
        { error: "Failed to analyze image", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return NextResponse.json(
        { error: "No response from AI model" },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let extractedData;
    try {
      // Try to find JSON in the response
      const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(messageContent);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", messageContent);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          rawResponse: messageContent,
        },
        { status: 500 }
      );
    }

    // Map event type to English keys
    const eventTypeMap: Record<string, string> = {
      "学术研究": "academic_research",
      "教学培训": "teaching_training",
      "学生活动": "student_activities",
      "产学研合作": "industry_academia",
      "行政管理": "administration",
      "重要截止": "important_deadlines",
    };

    // Normalize the extracted data
    const normalizedData = {
      title: extractedData.title || null,
      content: extractedData.content || null,
      date: extractedData.date || null,
      startTime: extractedData.startTime || null,
      endTime: extractedData.endTime || null,
      location: extractedData.location || null,
      organizers: Array.isArray(extractedData.organizers)
        ? extractedData.organizers
        : extractedData.organizers
        ? [extractedData.organizers]
        : [],
      eventType: extractedData.eventType
        ? eventTypeMap[extractedData.eventType] || null
        : null,
      tags: Array.isArray(extractedData.tags)
        ? extractedData.tags
        : extractedData.tags
        ? [extractedData.tags]
        : [],
      link: extractedData.link || null,
      datePrecision: extractedData.datePrecision || "exact",
    };

    return NextResponse.json({
      success: true,
      data: normalizedData,
      rawResponse: messageContent,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
