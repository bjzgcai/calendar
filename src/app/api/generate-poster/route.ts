import { NextRequest, NextResponse } from "next/server";
import { eventManager } from "@/storage/database/eventManager";
import { getSession } from "@/lib/session";
import {
  buildImagePosterSvg,
  buildPosterDateWindow,
  buildPosterAiRequestBody,
  DEFAULT_POSTER_AI_API_URL,
  extractPosterImageDataUrl,
  formatPosterDateRange,
  MAX_POSTER_EVENTS,
  resolvePosterAiModel,
} from "@/lib/poster-ai";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = DEFAULT_POSTER_AI_API_URL;

// Season detection based on month (Northern Hemisphere / China)
function getSeason(date: Date): "spring" | "summer" | "autumn" | "winter" {
  const month = date.getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

const SEASON_BACKGROUNDS: Record<string, Record<string, string>> = {
  spring: {
    活泼: `春季背景（活泼水墨彩色风）：
    在海报背景中绘制中国传统水墨风格的春景装饰，色彩鲜活：
    - 底部两侧绘制翠绿嫩草（用SVG path画柔软的小草芽，填充 #52c41a 和 #95de64）
    - 顶部或边角绘制盛开的桃花枝（用小圆形/椭圆画花瓣，浅粉#ffadd2至深粉#ff85c2）
    - 1-2只燕子飞翔剪影（简洁的黑色SVG path，尾巴分叉形状）
    - 柳条从顶角垂下（弧形线条，嫩绿色）
    - 装饰元素用透明度60-70%叠在内容底部，不遮挡文字`,
    严肃: `春季背景（水墨淡彩工笔风）：
    在海报背景中绘制中国传统淡墨风格的春景，雅致克制：
    - 底部用极淡的墨线画远山轮廓（灰度，透明度20-30%）
    - 边角点缀梅/桃花的写意枝条（淡墨线条，少量浅粉色点缀）
    - 1只飞燕剪影，用细线描绘
    - 整体淡雅，透明度控制在15-25%，烘托氛围而不喧宾夺主`,
    极客: `春季背景（极简像素中式风）：
    在暗色背景上用线条描绘简约中式春景：
    - 底部用亮绿色(#39ff14，透明度20%)画像素化草坪轮廓
    - 边角用简洁线条描绘竹节（等宽字体风格的几何竹子）
    - 1只像素化燕子（用小矩形组合而成）
    - 顶部点缀简约花朵（几何圆形）`,
    科技: `春季背景（科技感中式线描风）：
    在深蓝科技背景上叠加中式春景的荧光线描：
    - 底部用科技蓝线条(#00b4ff，透明度25%)描绘嫩草和山脉轮廓
    - 边角有流线型桃花枝（几何化花朵，蓝色辉光效果）
    - 燕子飞行轨迹用虚线表示，带动感
    - 春意与科技感融合`,
  },
  summer: {
    活泼: `夏季背景（活泼彩色风）：
    - 底部绘制荷花池景：荷叶（深绿圆形path）、荷花（粉红多瓣花朵）
    - 1-2只蜻蜓飞舞（红色身体，透明羽翼线条）
    - 顶部点缀云朵和阳光射线（明黄色）
    - 水波纹装饰（蓝色弧线）
    - 色彩饱和鲜亮，透明度60-70%`,
    严肃: `夏季背景（水墨淡彩风）：
    - 底部淡墨荷叶轮廓（墨线，透明度20%）
    - 侧边点缀荷花写意（淡粉，透明度15%）
    - 远山水墨（极淡，底部衬托）
    - 雅致清凉的夏日意境`,
    极客: `夏季背景（极简暗黑风）：
    - 底部像素化荷叶（#39ff14线条）
    - 矩阵化水波纹（#00d2ff点阵）
    - 几何化蜻蜓轮廓`,
    科技: `夏季背景（科技线描风）：
    - 荷花的几何线描（蓝色线框，多边形花瓣）
    - 水面反光线条（水平渐变线）
    - 动态感的水波圈`,
  },
  autumn: {
    活泼: `秋季背景（活泼暖色风）：
    - 底部和两侧散落枫叶（橙#fa8c16、红#f5222d、黄#fadb14，各种角度旋转）
    - 枫叶用SVG path画：五角或掌形叶片
    - 顶部点缀枫树枝（棕色干，橙叶）
    - 1-2只大雁飞行剪影（黑色V形path）
    - 秋日暖阳圆形（右上角，橙黄渐变）
    - 透明度60-70%`,
    严肃: `秋季背景（水墨淡彩风）：
    - 淡墨枫叶点缀边角（透明度15-20%）
    - 写意菊花（墨线描绘，淡黄）
    - 远山轮廓（极淡），大雁一字飞过`,
    极客: `秋季背景（极简暗黑风）：
    - 像素化枫叶散落（#bd93f9、#ff79c6）
    - 几何大雁V队形
    - 树干轮廓线条`,
    科技: `秋季背景（科技线描风）：
    - 枫叶的多边形几何线框（蓝色）
    - 飘落轨迹虚线
    - 科技感网格叠加`,
  },
  winter: {
    活泼: `冬季背景（活泼清新风）：
    - 底部雪地效果（白色/浅蓝不规则形状）
    - 边角绘制红梅枝（棕色干，红色五瓣花#f5222d）
    - 雪花点缀（白色六角星形，散落各处）
    - 1-2只喜鹊（黑白剪影，中国传统吉祥鸟）
    - 透明度60-70%`,
    严肃: `冬季背景（水墨风）：
    - 淡墨梅花枝（经典水墨意境，透明度20%）
    - 极淡雪花点缀
    - 远山留白（大气）`,
    极客: `冬季背景（极简暗黑风）：
    - 像素雪花（#00d2ff点状）
    - 几何梅花（圆形组合）
    - 低温感蓝白配色`,
    科技: `冬季背景（科技线描风）：
    - 雪花的几何结构线描（蓝色，带辉光）
    - 梅花的线框几何版本
    - 冰晶感折射光线`,
  },
};

const STYLE_DESCRIPTIONS: Record<string, string> = {
  活泼: `明亮活泼风格：
  - 主色调：橙色(#ff6b35)、粉色(#ff4d8d)、黄色(#ffd60a)
  - 使用圆角矩形(rx="16")卡片，彩色边框
  - 顶部大标题使用渐变色填充
  - 活动卡片交替使用淡彩色背景
  - 使用圆形彩色标签标注活动类型
  - 整体感觉：活力四射、轻松有趣`,

  严肃: `专业严肃风格：
  - 主色调：深海军蓝(#1a2744)、中灰(#495057)、细节用金色(#c9a84c)
  - 顶部横幅：深色实底，白色标题文字
  - 活动条目：简洁的分割线排版，无多余装饰
  - 字体层次分明：标题粗体，正文正常，说明文字浅灰
  - 卡片无圆角或极小圆角(rx="4")，细边框
  - 整体感觉：正式庄重、权威可信`,

  极客: `极客暗黑风格：
  - 背景：#0d1117（GitHub Dark）或 #1a1b27
  - 主色调：终端绿(#39ff14)、青色(#00d2ff)、紫色(#bd93f9)
  - 顶部：模拟终端/代码编辑器外观，带行号或命令提示符
  - 标题：使用等宽字体风格，加"[" "]"或"<>" 装饰
  - 活动条目：使用代码块风格的卡片，带注释风格的文字（// 日期）
  - 整体感觉：技术感、编程文化、黑客精神`,

  科技: `未来科技风格：
  - 背景：深蓝渐变(#020b18 → #071a35)，可加微妙的网格线
  - 主色调：科技蓝(#00b4ff)、青色(#00f5ff)、白色
  - 顶部：全宽科技感横幅，带几何装饰线条
  - 活动卡片：半透明效果（用浅蓝色半透明背景模拟），亮色边框
  - 装饰：菱形、六边形、对角线等几何元素
  - 整体感觉：未来感、高科技、企业科技`,
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  academic_research: "学术研究",
  teaching_training: "教学培训",
  student_activities: "学生活动",
  industry_academia: "产学研",
  administration: "行政",
  important_deadlines: "重要节点",
};

export async function POST(request: NextRequest) {
  try {
    // Auth check (skipped in development for local testing)
    if (process.env.NODE_ENV !== "development") {
      const session = await getSession();
      if (!session.isLoggedIn) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
      }
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const { style = "活泼", eventTypeFilter, organizerFilter, tagsFilter } = await request.json();

    const now = new Date();
    const { startDate } = buildPosterDateWindow(now);

    const events = await eventManager.getAllEvents({
      startDate,
      limit: MAX_POSTER_EVENTS,
      recurrenceRule: "none",
      eventType: eventTypeFilter || undefined,
      organizer: organizerFilter || undefined,
      tags: tagsFilter?.length ? tagsFilter.join(",") : undefined,
    });

    const eventsToShow = events.slice(0, MAX_POSTER_EVENTS);
    const lastEvent = eventsToShow[eventsToShow.length - 1];
    const dateRangeEnd = lastEvent ? new Date(lastEvent.startTime) : startDate;
    const dateRangeStr = formatPosterDateRange(startDate, dateRangeEnd);

    const eventCount = eventsToShow.length;
    const season = getSeason(startDate);
    const seasonNames: Record<string, string> = { spring: "春", summer: "夏", autumn: "秋", winter: "冬" };
    const seasonBg = SEASON_BACKGROUNDS[season][style] || SEASON_BACKGROUNDS[season]["活泼"];
    const styleDesc = STYLE_DESCRIPTIONS[style] || STYLE_DESCRIPTIONS["活泼"];
    const eventTypesSummary = Array.from(
      new Set(
        eventsToShow
          .map((event) => event.eventType?.split(",")[0]?.trim())
          .filter((eventType): eventType is string => !!eventType)
          .map((eventType) => EVENT_TYPE_LABELS[eventType] || eventType)
      )
    ).join("、") || "综合活动";
    const prompt = `Use case: ads-marketing
Asset type: vertical campus event calendar poster background, 2:3 aspect ratio.
Primary request: Create a polished visual background layer for a 中关村学院 activity calendar poster.
Season theme: ${seasonNames[season]}季, China, elegant seasonal atmosphere.
Visual style: ${style}. Modern Chinese design with refined academic tone, clean composition, rich but restrained visual detail.
Style reference, adapt visually without drawing text: ${styleDesc}
Seasonal motif reference, adapt visually without drawing text: ${seasonBg}
Composition: vertical poster with clear top title area, a calm readable center content area, and a small footer area. Leave generous empty space for real event text overlays. The final poster will contain ${eventCount} event cards for ${dateRangeStr}. Event categories: ${eventTypesSummary}.
Text rules: do not include readable text, letters, numbers, logos, QR codes, watermarks, or fake event names. Typography will be added by the application after image generation.
Constraints: no people, no building signage, no external brand marks, keep the center readable and uncluttered.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": request.headers.get("origin") || "",
        "X-Title": "Event Calendar Poster Generator",
      },
      body: JSON.stringify({
        ...buildPosterAiRequestBody(prompt),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      return NextResponse.json(
        { error: "AI生成失败", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const backgroundDataUrl = extractPosterImageDataUrl(data);

    if (!backgroundDataUrl) {
      return NextResponse.json(
        { error: "AI未能生成有效的海报图片，请重试" },
        { status: 500 }
      );
    }

    const svg = buildImagePosterSvg({
      backgroundDataUrl,
      dateRange: dateRangeStr,
      generatedDate: now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }),
      events: eventsToShow.map((event) => ({
        title: event.title,
        startTime: event.startTime,
        location: event.location,
        organizer: event.organizer,
        eventType: event.eventType,
        recurrenceRule: event.recurrenceRule,
      })),
    });

    return NextResponse.json({ svg, eventCount: eventsToShow.length, model: resolvePosterAiModel() });
  } catch (error) {
    console.error("Error generating poster:", error);
    return NextResponse.json(
      {
        error: "生成海报失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
