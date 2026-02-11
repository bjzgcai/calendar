/**
 * 中国法定节假日和调休数据
 *
 * 数据来源：国务院办公厅发布的节假日安排通知
 * 更新时间：每年11月30日根据官方发布更新下一年数据
 */

export interface HolidayData {
  date: string // YYYY-MM-DD
  name: string
  isHoliday: boolean // true=假期, false=调休补班
  holidayType?: 'new-year' | 'spring-festival' | 'qingming' | 'labor-day' | 'dragon-boat' | 'mid-autumn' | 'national-day'
}

/**
 * 2026年中国法定节假日
 * 基于国务院办公厅2025年11月发布的2026年节假日安排
 */
export const holidays2026: HolidayData[] = [
  // 元旦 (1月1-3日，共3天)
  { date: '2026-01-01', name: '元旦', isHoliday: true, holidayType: 'new-year' },
  { date: '2026-01-02', name: '元旦', isHoliday: true, holidayType: 'new-year' },
  { date: '2026-01-03', name: '元旦', isHoliday: true, holidayType: 'new-year' },

  // 春节 (2月15-21日，共7天) - 2026年春节是2月17日（正月初一）
  // 调休：2月14日(周六)、2月22日(周日)上班
  { date: '2026-02-14', name: '春节调休', isHoliday: false, holidayType: 'spring-festival' },
  { date: '2026-02-15', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2026-02-16', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2026-02-17', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2026-02-18', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2026-02-19', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2026-02-20', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2026-02-21', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2026-02-22', name: '春节调休', isHoliday: false, holidayType: 'spring-festival' },

  // 清明节 (4月4-6日，共3天) - 2026年清明节是4月5日
  { date: '2026-04-04', name: '清明节', isHoliday: true, holidayType: 'qingming' },
  { date: '2026-04-05', name: '清明节', isHoliday: true, holidayType: 'qingming' },
  { date: '2026-04-06', name: '清明节', isHoliday: true, holidayType: 'qingming' },

  // 劳动节 (5月1-5日，共5天)
  // 调休：4月26日(周日)、5月9日(周六)上班
  { date: '2026-04-26', name: '劳动节调休', isHoliday: false, holidayType: 'labor-day' },
  { date: '2026-05-01', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2026-05-02', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2026-05-03', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2026-05-04', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2026-05-05', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2026-05-09', name: '劳动节调休', isHoliday: false, holidayType: 'labor-day' },

  // 端午节 (6月25-27日，共3天) - 2026年端午节是6月26日（五月初五）
  { date: '2026-06-25', name: '端午节', isHoliday: true, holidayType: 'dragon-boat' },
  { date: '2026-06-26', name: '端午节', isHoliday: true, holidayType: 'dragon-boat' },
  { date: '2026-06-27', name: '端午节', isHoliday: true, holidayType: 'dragon-boat' },

  // 国庆节、中秋节 (10月1-8日，共8天) - 2026年中秋节是10月6日（八月十五）
  // 调休：9月27日(周日)、10月10日(周六)上班
  { date: '2026-09-27', name: '国庆节调休', isHoliday: false, holidayType: 'national-day' },
  { date: '2026-10-01', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2026-10-02', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2026-10-03', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2026-10-04', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2026-10-05', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2026-10-06', name: '中秋节', isHoliday: true, holidayType: 'mid-autumn' },
  { date: '2026-10-07', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2026-10-08', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2026-10-10', name: '国庆节调休', isHoliday: false, holidayType: 'national-day' },
]

/**
 * 2027年中国法定节假日（预测）
 * 注意：2027年的具体安排需要在2026年11月30日根据国务院发布更新
 */
export const holidays2027: HolidayData[] = [
  // 元旦 (预测1月1-3日)
  { date: '2027-01-01', name: '元旦', isHoliday: true, holidayType: 'new-year' },
  { date: '2027-01-02', name: '元旦', isHoliday: true, holidayType: 'new-year' },
  { date: '2027-01-03', name: '元旦', isHoliday: true, holidayType: 'new-year' },

  // 春节 (预测2月6-12日) - 2027年春节是2月7日（正月初一）
  { date: '2027-02-06', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2027-02-07', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2027-02-08', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2027-02-09', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2027-02-10', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2027-02-11', name: '春节', isHoliday: true, holidayType: 'spring-festival' },
  { date: '2027-02-12', name: '春节', isHoliday: true, holidayType: 'spring-festival' },

  // 清明节 (预测4月4-6日)
  { date: '2027-04-04', name: '清明节', isHoliday: true, holidayType: 'qingming' },
  { date: '2027-04-05', name: '清明节', isHoliday: true, holidayType: 'qingming' },
  { date: '2027-04-06', name: '清明节', isHoliday: true, holidayType: 'qingming' },

  // 劳动节 (预测5月1-5日)
  { date: '2027-05-01', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2027-05-02', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2027-05-03', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2027-05-04', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },
  { date: '2027-05-05', name: '劳动节', isHoliday: true, holidayType: 'labor-day' },

  // 端午节 (预测6月14-16日) - 2027年端午节是6月15日
  { date: '2027-06-14', name: '端午节', isHoliday: true, holidayType: 'dragon-boat' },
  { date: '2027-06-15', name: '端午节', isHoliday: true, holidayType: 'dragon-boat' },
  { date: '2027-06-16', name: '端午节', isHoliday: true, holidayType: 'dragon-boat' },

  // 中秋节 (预测9月25-27日) - 2027年中秋节是9月26日
  { date: '2027-09-25', name: '中秋节', isHoliday: true, holidayType: 'mid-autumn' },
  { date: '2027-09-26', name: '中秋节', isHoliday: true, holidayType: 'mid-autumn' },
  { date: '2027-09-27', name: '中秋节', isHoliday: true, holidayType: 'mid-autumn' },

  // 国庆节 (预测10月1-7日)
  { date: '2027-10-01', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2027-10-02', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2027-10-03', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2027-10-04', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2027-10-05', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2027-10-06', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
  { date: '2027-10-07', name: '国庆节', isHoliday: true, holidayType: 'national-day' },
]

/**
 * 合并所有年份的节假日数据
 */
export const allHolidays: HolidayData[] = [
  ...holidays2026,
  ...holidays2027,
]

/**
 * 将节假日数据转换为 Map，方便快速查询
 */
export const holidayMap = new Map<string, HolidayData>(
  allHolidays.map(holiday => [holiday.date, holiday])
)

/**
 * 检查某个日期是否是节假日
 */
export function isHoliday(date: Date | string): boolean {
  const dateStr = typeof date === 'string' ? date : formatDate(date)
  const holiday = holidayMap.get(dateStr)
  return holiday?.isHoliday === true
}

/**
 * 检查某个日期是否是调休补班日
 */
export function isWorkday(date: Date | string): boolean {
  const dateStr = typeof date === 'string' ? date : formatDate(date)
  const holiday = holidayMap.get(dateStr)
  return holiday?.isHoliday === false
}

/**
 * 获取某个日期的节假日信息
 */
export function getHolidayInfo(date: Date | string): HolidayData | undefined {
  const dateStr = typeof date === 'string' ? date : formatDate(date)
  return holidayMap.get(dateStr)
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 更新节假日数据（在每年11月30日调用）
 * TODO: 实现自动更新逻辑，可以从API获取或手动更新
 */
export async function updateHolidays(year: number): Promise<void> {
  console.log(`需要更新 ${year} 年的节假日数据`)
  // 这里可以实现从API获取节假日数据的逻辑
  // 例如：
  // - 从国务院官网爬取
  // - 使用第三方节假日API
  // - 手动更新此文件
}
