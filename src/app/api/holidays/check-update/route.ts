import { NextRequest, NextResponse } from "next/server"

/**
 * 检查是否需要更新节假日数据
 * 在每年11月30日检查下一年的节假日数据是否已更新
 */
export async function GET(request: NextRequest) {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1 // 0-based
  const currentDay = today.getDate()

  // 检查是否是11月30日或之后
  const shouldCheckUpdate = currentMonth === 11 && currentDay >= 30

  if (shouldCheckUpdate) {
    const nextYear = currentYear + 1

    return NextResponse.json({
      needsUpdate: true,
      message: `请更新 ${nextYear} 年的节假日数据`,
      currentYear,
      nextYear,
      instructions: [
        `1. 访问国务院办公厅官网查看 ${nextYear} 年节假日安排通知`,
        `2. 或使用节假日API获取最新数据`,
        `3. 更新 src/lib/chinese-holidays.ts 文件中的 holidays${nextYear} 数组`,
        `4. 确保调休日期也已正确标记`,
      ],
      apiSuggestions: [
        "可使用的API: https://timor.tech/api/holiday/year/{year}",
        "或者: https://api.apihubs.cn/holiday/get?year={year}",
      ],
    })
  }

  return NextResponse.json({
    needsUpdate: false,
    message: "当前不需要更新节假日数据",
    currentYear,
    nextCheckDate: `${currentYear}-11-30`,
  })
}

/**
 * 手动触发更新检查和获取节假日数据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year } = body

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "请提供有效的年份参数" },
        { status: 400 }
      )
    }

    // 尝试从第三方API获取节假日数据
    // 注意：这里使用的API可能需要根据实际情况调整
    try {
      const response = await fetch(`https://timor.tech/api/holiday/year/${year}`)

      if (!response.ok) {
        throw new Error("API请求失败")
      }

      const data = await response.json()

      return NextResponse.json({
        success: true,
        year,
        data,
        message: "节假日数据获取成功，请手动更新 src/lib/chinese-holidays.ts 文件",
        instructions: [
          "1. 将获取的数据转换为 HolidayData 格式",
          "2. 更新对应年份的节假日数组",
          "3. 确保包含调休日期",
          "4. 测试日历显示是否正确",
        ],
      })
    } catch (apiError) {
      return NextResponse.json({
        success: false,
        message: "无法从API获取数据，请手动查看国务院官网",
        year,
        manualUpdateInstructions: [
          `1. 访问 http://www.gov.cn/ 搜索 "${year}年节假日安排"`,
          "2. 根据官方通知更新 src/lib/chinese-holidays.ts",
          "3. 注意调休日期的标记",
        ],
        error: apiError instanceof Error ? apiError.message : "Unknown error",
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "请求处理失败",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
