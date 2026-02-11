#!/usr/bin/env tsx

/**
 * 检查节假日数据更新脚本
 *
 * 用途：在每年11月30日自动检查是否需要更新下一年的节假日数据
 *
 * 使用方法：
 * 1. 手动运行: tsx scripts/check-holiday-update.ts
 * 2. 添加到 cron job (Linux/macOS):
 *    0 9 * 11 * cd /path/to/calendar && tsx scripts/check-holiday-update.ts
 * 3. 添加到 Windows 任务计划程序
 *
 * 通知方式：
 * - 控制台输出
 * - 可选：发送邮件/钉钉通知（需要配置）
 */

async function checkHolidayUpdate() {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()

  console.log('=' .repeat(60))
  console.log('中国节假日数据更新检查')
  console.log('=' .repeat(60))
  console.log(`当前日期: ${currentYear}-${currentMonth}-${currentDay}`)
  console.log('')

  // 检查是否是11月30日或之后
  const shouldUpdate = currentMonth === 11 && currentDay >= 30
  const nextYear = currentYear + 1

  if (shouldUpdate) {
    console.log('⚠️  需要更新节假日数据！')
    console.log('')
    console.log(`请更新 ${nextYear} 年的节假日数据`)
    console.log('')
    console.log('更新步骤：')
    console.log(`1. 访问国务院办公厅官网查看 ${nextYear} 年节假日安排通知`)
    console.log('   网址: http://www.gov.cn/')
    console.log('')
    console.log('2. 或使用以下API获取数据：')
    console.log(`   - https://timor.tech/api/holiday/year/${nextYear}`)
    console.log(`   - https://api.apihubs.cn/holiday/get?year=${nextYear}`)
    console.log('')
    console.log('3. 更新文件：src/lib/chinese-holidays.ts')
    console.log(`   - 更新 holidays${nextYear} 数组`)
    console.log('   - 确保包含所有节假日和调休日期')
    console.log('   - 调休日期的 isHoliday 应设为 false')
    console.log('')
    console.log('4. 测试更新：')
    console.log('   - pnpm dev')
    console.log('   - 在日历中检查节假日是否正确显示')
    console.log('')

    // 尝试从API获取数据
    console.log('正在尝试从API获取数据...')
    try {
      const response = await fetch(`https://timor.tech/api/holiday/year/${nextYear}`)
      if (response.ok) {
        const data = await response.json()
        console.log('')
        console.log('✅ API数据获取成功:')
        console.log(JSON.stringify(data, null, 2))
        console.log('')
        console.log('请根据以上数据手动更新 src/lib/chinese-holidays.ts')
      } else {
        throw new Error('API请求失败')
      }
    } catch (error) {
      console.log('')
      console.log('❌ 无法从API获取数据，请手动访问官网查看')
      console.log(`   错误信息: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // 如果配置了钉钉机器人，发送通知
    if (process.env.DINGTALK_WEBHOOK_URL) {
      await sendDingTalkNotification(nextYear)
    }

  } else {
    console.log('✅ 当前不需要更新节假日数据')
    console.log(`下次检查日期: ${currentYear}-11-30`)
  }

  console.log('')
  console.log('=' .repeat(60))
}

/**
 * 发送钉钉通知
 */
async function sendDingTalkNotification(year: number) {
  const webhookUrl = process.env.DINGTALK_WEBHOOK_URL

  if (!webhookUrl) {
    return
  }

  try {
    const message = {
      msgtype: 'markdown',
      markdown: {
        title: `节假日数据更新提醒`,
        text: `### 🔔 节假日数据更新提醒\n\n` +
              `需要更新 **${year}年** 的节假日数据\n\n` +
              `#### 更新步骤：\n` +
              `1. 访问 [国务院办公厅官网](http://www.gov.cn/) 查看节假日安排\n` +
              `2. 更新文件：\`src/lib/chinese-holidays.ts\`\n` +
              `3. 测试日历显示是否正确\n\n` +
              `#### API数据源：\n` +
              `- [Timor API](https://timor.tech/api/holiday/year/${year})\n` +
              `- [APIHubs](https://api.apihubs.cn/holiday/get?year=${year})\n\n` +
              `请及时更新！`,
      },
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (response.ok) {
      console.log('✅ 钉钉通知发送成功')
    } else {
      console.log('❌ 钉钉通知发送失败')
    }
  } catch (error) {
    console.log('❌ 钉钉通知发送失败:', error)
  }
}

// 运行检查
checkHolidayUpdate().catch(console.error)
