/**
 * 农历日历工具函数
 * 使用 lunar-javascript 库转换公历到农历
 */

import { Lunar, Solar } from 'lunar-javascript'

/**
 * 获取农历日期显示文本
 * @param date 公历日期
 * @returns 农历日期文本，如 "正月初一"、"腊月廿九"
 */
export function getLunarDateText(date: Date): string {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  // 获取农历月份和日期
  const monthInChinese = lunar.getMonthInChinese()
  const dayInChinese = lunar.getDayInChinese()

  return `${monthInChinese}${dayInChinese}`
}

/**
 * 获取简短的农历日期（只显示日期数字）
 * @param date 公历日期
 * @returns 农历日期，如 "初一"、"廿九"
 */
export function getLunarDayText(date: Date): string {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  return lunar.getDayInChinese()
}

/**
 * 获取农历月份
 * @param date 公历日期
 * @returns 农历月份，如 "正月"、"腊月"
 */
export function getLunarMonthText(date: Date): string {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  return lunar.getMonthInChinese()
}

/**
 * 检查是否是农历节日
 * @param date 公历日期
 * @returns 节日信息，如 "春节"、"端午节"
 */
export function getLunarFestival(date: Date): string | null {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  // 获取农历节日
  const festivals = lunar.getFestivals()

  if (festivals && festivals.length > 0) {
    return festivals[0]
  }

  return null
}

/**
 * 获取公历节日
 * @param date 公历日期
 * @returns 节日信息
 */
export function getSolarFestival(date: Date): string | null {
  const solar = Solar.fromDate(date)
  const festivals = solar.getFestivals()

  if (festivals && festivals.length > 0) {
    return festivals[0]
  }

  return null
}

/**
 * 获取完整的日历信息（包含农历和节日）
 * @param date 公历日期
 * @returns 日历信息对象
 */
export function getCalendarInfo(date: Date) {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  return {
    solarYear: solar.getYear(),
    solarMonth: solar.getMonth(),
    solarDay: solar.getDay(),
    lunarYear: lunar.getYear(),
    lunarMonth: lunar.getMonth(),
    lunarDay: lunar.getDay(),
    lunarMonthInChinese: lunar.getMonthInChinese(),
    lunarDayInChinese: lunar.getDayInChinese(),
    lunarFestivals: lunar.getFestivals(),
    solarFestivals: solar.getFestivals(),
    // 是否是农历初一（显示月份）
    isFirstDayOfMonth: lunar.getDay() === 1,
  }
}
