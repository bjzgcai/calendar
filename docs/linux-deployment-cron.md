# Linux 生产环境定时任务部署指南

## 当前状态 ✅

节假日更新检查的 cron 定时任务已成功部署在Linux系统上。

## 定时任务详情

```bash
# 执行时间：每年11月的每天上午9:00
# 日志文件：logs/holiday-check.log
0 9 * 11 * cd /home/carter/calendar && pnpm check-holidays >> /home/carter/calendar/logs/holiday-check.log 2>&1
```

**说明**：
- ⏰ **执行频率**：每年11月1日至30日，每天上午9:00
- 📝 **日志记录**：所有输出保存到 `logs/holiday-check.log`
- 🔔 **提醒目的**：在国务院发布下一年节假日安排后及时更新数据

## 常用管理命令

### 查看定时任务

```bash
# 查看所有定时任务
crontab -l

# 查看节假日检查任务
crontab -l | grep check-holidays
```

### 编辑定时任务

```bash
# 打开 crontab 编辑器
crontab -e

# 修改执行时间或删除任务
```

### 手动运行检查

```bash
# 在项目目录下运行
cd /home/carter/calendar
pnpm check-holidays
```

### 查看日志

```bash
# 查看最新日志
tail -f /home/carter/calendar/logs/holiday-check.log

# 查看所有日志
cat /home/carter/calendar/logs/holiday-check.log

# 查看最近20行
tail -n 20 /home/carter/calendar/logs/holiday-check.log
```

### 清理日志

```bash
# 清空日志文件
> /home/carter/calendar/logs/holiday-check.log

# 或删除后重新创建
rm /home/carter/calendar/logs/holiday-check.log
```

## 修改执行时间

如果需要修改定时任务的执行时间，编辑 crontab：

```bash
crontab -e
```

Cron 时间格式：
```
分 时 日 月 星期
│ │ │ │ │
│ │ │ │ └── 0-6 (0=Sunday)
│ │ │ └──── 1-12
│ │ └────── 1-31
│ └──────── 0-23
└────────── 0-59
```

**示例**：
```bash
# 每年11月每天上午9:00
0 9 * 11 *

# 每年11月每天下午3:30
30 15 * 11 *

# 每年11月25-30日上午9:00
0 9 25-30 11 *

# 每年11月最后一天上午9:00
0 9 30 11 *
```

## 重新部署定时任务

如果需要重新设置（比如项目路径变更），运行：

```bash
cd /home/carter/calendar
bash scripts/setup-cron.sh
```

脚本会：
1. 检测已存在的任务
2. 询问是否删除并重新创建
3. 创建日志目录
4. 添加新的定时任务

## 删除定时任务

### 方法1：使用脚本（推荐）

```bash
crontab -l | grep -v "check-holidays" | crontab -
```

### 方法2：手动编辑

```bash
crontab -e
# 删除包含 check-holidays 的行，保存退出
```

## 验证任务运行

### 模拟11月检查

临时修改系统日期（仅用于测试，**生产环境慎用**）：

```bash
# 保存当前日期
current_date=$(date)

# 设置为11月30日（需要 root 权限）
sudo date -s "2026-11-30 09:00:00"

# 运行检查
pnpm check-holidays

# 恢复日期
sudo date -s "$current_date"
```

**推荐方式**：直接查看脚本逻辑，无需修改系统日期

```bash
# 查看检查脚本
cat scripts/check-holiday-update.ts

# 手动运行测试
pnpm check-holidays
```

## 故障排查

### 问题1：定时任务未执行

**检查步骤**：

```bash
# 1. 确认 cron 服务运行
sudo systemctl status cron
# 或
sudo service cron status

# 2. 查看 cron 日志
sudo tail -f /var/log/syslog | grep CRON
# 或
sudo tail -f /var/log/cron

# 3. 检查任务语法
crontab -l | grep check-holidays

# 4. 测试命令是否能手动执行
cd /home/carter/calendar && pnpm check-holidays
```

### 问题2：日志文件未生成

```bash
# 检查日志目录权限
ls -la /home/carter/calendar/logs/

# 确保目录存在
mkdir -p /home/carter/calendar/logs

# 检查磁盘空间
df -h

# 手动运行并观察输出
cd /home/carter/calendar
pnpm check-holidays >> logs/holiday-check.log 2>&1
```

### 问题3：pnpm 命令未找到

定时任务可能找不到 pnpm，需要使用绝对路径：

```bash
# 查找 pnpm 路径
which pnpm

# 假设输出为 /usr/local/bin/pnpm
# 修改 crontab
crontab -e

# 将任务改为：
0 9 * 11 * cd /home/carter/calendar && /usr/local/bin/pnpm check-holidays >> /home/carter/calendar/logs/holiday-check.log 2>&1
```

或者在 crontab 顶部添加 PATH：

```bash
crontab -e

# 在第一行添加
PATH=/usr/local/bin:/usr/bin:/bin
```

## 监控和告警（可选）

### 添加邮件通知

如果系统配置了邮件服务，可以接收任务执行结果：

```bash
crontab -e

# 添加 MAILTO
MAILTO=your-email@example.com
0 9 * 11 * cd /home/carter/calendar && pnpm check-holidays >> /home/carter/calendar/logs/holiday-check.log 2>&1
```

### 钉钉机器人通知

在环境变量中配置钉钉 Webhook：

```bash
# 编辑 .env.local
echo "DINGTALK_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN" >> .env.local
```

脚本会自动发送通知到钉钉群。

## 生产环境最佳实践

1. **日志轮转**：防止日志文件过大

```bash
# 创建 logrotate 配置
sudo nano /etc/logrotate.d/calendar-holidays

# 添加以下内容：
/home/carter/calendar/logs/holiday-check.log {
    monthly
    rotate 12
    compress
    missingok
    notifempty
}
```

2. **监控告警**：集成到监控系统
   - 检查日志文件修改时间
   - 监控脚本执行成功率
   - 设置告警规则

3. **备份定时任务**：

```bash
# 导出 crontab
crontab -l > ~/crontab-backup-$(date +%Y%m%d).txt

# 恢复 crontab
crontab ~/crontab-backup-20260211.txt
```

## 相关文档

- [节假日功能快速开始](../HOLIDAYS-README.md)
- [节假日详细指南](./chinese-holidays-guide.md)
- [更新检查脚本](../scripts/check-holiday-update.ts)

---

**部署日期**：2026-02-11
**系统**：Linux
**项目路径**：`/home/carter/calendar`
