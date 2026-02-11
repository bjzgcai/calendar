#!/bin/bash

# 设置节假日更新检查的定时任务
# 用途：在每年11月的每天上午9点检查是否需要更新下一年的节假日数据

# 获取项目根目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "中国节假日自动更新检查 - Cron 定时任务设置"
echo "================================================"
echo ""
echo "项目路径: $PROJECT_ROOT"
echo ""

# 生成 cron job 命令
CRON_COMMAND="0 9 * 11 * cd $PROJECT_ROOT && pnpm check-holidays >> $PROJECT_ROOT/logs/holiday-check.log 2>&1"

echo "将添加以下定时任务："
echo "$CRON_COMMAND"
echo ""
echo "说明："
echo "  - 执行时间：每年11月的每天上午9:00"
echo "  - 执行命令：pnpm check-holidays"
echo "  - 日志文件：logs/holiday-check.log"
echo ""

# 创建日志目录
mkdir -p "$PROJECT_ROOT/logs"

# 检查是否已经存在该 cron job
(crontab -l 2>/dev/null | grep -F "check-holidays") && {
  echo "⚠️  检测到已存在的节假日检查任务"
  echo ""
  read -p "是否要删除旧任务并重新添加？(y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 删除旧的 cron job
    crontab -l 2>/dev/null | grep -v "check-holidays" | crontab -
    echo "✅ 已删除旧任务"
  else
    echo "❌ 取消操作"
    exit 0
  fi
}

# 添加新的 cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 定时任务添加成功！"
  echo ""
  echo "当前的 crontab 配置："
  echo "-----------------------------------"
  crontab -l | grep "check-holidays"
  echo "-----------------------------------"
  echo ""
  echo "测试运行："
  echo "  pnpm check-holidays"
  echo ""
  echo "查看日志："
  echo "  tail -f $PROJECT_ROOT/logs/holiday-check.log"
  echo ""
  echo "删除定时任务："
  echo "  crontab -e"
  echo "  (然后删除包含 check-holidays 的行)"
else
  echo "❌ 定时任务添加失败"
  exit 1
fi
