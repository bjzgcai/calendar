/**
 * Type declarations for lunar-javascript
 * https://github.com/6tail/lunar-javascript
 */

declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar
    getYear(): number
    getMonth(): number
    getDay(): number
    getLunar(): Lunar
    getFestivals(): string[]
  }

  export class Lunar {
    getYear(): number
    getMonth(): number
    getDay(): number
    getMonthInChinese(): string
    getDayInChinese(): string
    getFestivals(): string[]
    getSolar(): Solar
  }
}
