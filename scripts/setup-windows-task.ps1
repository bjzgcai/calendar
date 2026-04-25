# Windows 任务计划程序设置脚本
# 用途：在 Windows 系统上设置节假日更新检查的定时任务

param(
    [string]$ProjectPath = (Get-Location).Path
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "中国节假日自动更新检查 - Windows 任务计划设置" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "项目路径: $ProjectPath" -ForegroundColor Yellow
Write-Host ""

# 任务名称
$TaskName = "Calendar-Holiday-Check"

# 检查任务是否已存在
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($ExistingTask) {
    Write-Host "⚠️  检测到已存在的任务: $TaskName" -ForegroundColor Yellow
    $Response = Read-Host "是否要删除并重新创建？(Y/N)"

    if ($Response -eq 'Y' -or $Response -eq 'y') {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "✅ 已删除旧任务" -ForegroundColor Green
    } else {
        Write-Host "❌ 取消操作" -ForegroundColor Red
        exit
    }
}

# 查找 Node.js 路径
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodePath) {
    Write-Host "❌ 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Node.js 路径: $NodePath" -ForegroundColor Green

# 创建日志目录
$LogDir = Join-Path $ProjectPath "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# 创建任务操作
$Action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument ".\node_modules\.bin\tsx scripts\check-holiday-update.ts" `
    -WorkingDirectory $ProjectPath

# 创建任务触发器（每年11月的每天上午9:00）
$Trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At 9am

# 设置触发器只在11月运行
$Trigger.StartBoundary = [DateTime]::Parse((Get-Date).Year.ToString() + "-11-01T09:00:00")
$Trigger.EndBoundary = [DateTime]::Parse((Get-Date).Year.ToString() + "-11-30T23:59:59")

# 创建任务设置
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

# 注册任务
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Description "检查中国节假日数据更新 - 每年11月每天上午9:00运行" `
        -ErrorAction Stop | Out-Null

    Write-Host ""
    Write-Host "✅ 定时任务创建成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "任务详情：" -ForegroundColor Cyan
    Write-Host "  任务名称: $TaskName"
    Write-Host "  运行时间: 每年11月1-30日，每天上午9:00"
    Write-Host "  执行命令: pnpm check-holidays"
    Write-Host "  工作目录: $ProjectPath"
    Write-Host ""
    Write-Host "管理任务：" -ForegroundColor Cyan
    Write-Host "  查看任务: taskschd.msc (打开任务计划程序)"
    Write-Host "  手动运行: pnpm check-holidays"
    Write-Host "  删除任务: Unregister-ScheduledTask -TaskName '$TaskName'"
    Write-Host ""
    Write-Host "测试运行：" -ForegroundColor Cyan
    Write-Host "  cd $ProjectPath"
    Write-Host "  pnpm check-holidays"
    Write-Host ""

} catch {
    Write-Host "❌ 任务创建失败: $_" -ForegroundColor Red
    exit 1
}

# 显示任务信息
Write-Host "当前任务状态：" -ForegroundColor Cyan
Get-ScheduledTask -TaskName $TaskName | Format-List TaskName, State, LastRunTime, NextRunTime
