# 不确定日期事件功能

## 功能概述

支持在日历中显示"月份确定但具体日期不确定"的事件。例如：
- "3月某天有一个重要会议"
- "第二季度举办年度活动"
- "2024年内完成某项目"

## 数据库字段

### `date_precision` (日期精确度)
- `exact`: 精确日期时间（默认）
- `month`: 仅知道月份
- `quarter`: 仅知道季度
- `year`: 仅知道年份

### `approximate_month` (近似月份)
- 格式：`YYYY-MM` (例如 `2024-03` 表示2024年3月)
- 仅在 `date_precision` 不为 `exact` 时使用
- 用于指定事件大致发生的时间范围

## 显示逻辑

### 年视图 (Multi-Month Year View)
- ✅ **日期待定**: 在对应月份显示，带虚线边框和斜纹背景
- ✅ **季度待定**: 在季度第一个月显示
- ✅ **年度待定**: 在年初显示

### 月视图 (Month View)
- ✅ **日期待定**: 显示在**月初（1号）**，带特殊样式标识
- ✅ **精确日期**: 正常显示在具体日期
- ❌ **季度/年度待定**: 不显示（避免视图混乱）

### 周视图 / 日视图 (Week / Day View)
- ✅ **精确日期**: 正常显示
- ❌ **日期待定**: 不显示（避免与精确事件混淆）
- ❌ **季度/年度待定**: 不显示

### 列表视图 (List View)
- ✅ 所有类型事件都显示
- 日期待定事件带 📅 图标前缀

## 视觉标识

### 事件样式
1. **虚线边框**: 区别于精确日期的实线边框
2. **斜纹背景**: 45度斜向条纹，提示"不确定"状态
3. **右上角图标**: 📅? 小图标标识
4. **特殊颜色**:
   - 日期待定: 蓝色渐变 `#3b82f6`
   - 季度待定: 紫色渐变 `#a855f7`
   - 年度待定: 灰色渐变 `#6b7280`

### Tooltip 提示
- 顶部显示 **"📅 日期待定"** 徽章
- 时间显示为: `2024年3月（日期待定）`

## 创建示例

### API 请求示例

```json
{
  "title": "春季学术研讨会",
  "content": "具体日期待定，预计3月举办",
  "startTime": "2024-03-01T00:00:00Z",
  "endTime": "2024-03-01T23:59:59Z",
  "datePrecision": "month",
  "approximateMonth": "2024-03",
  "organizer": "科学研究中心",
  "eventType": "academic_research",
  "tags": "学术 研讨会"
}
```

### 前端表单字段

在事件表单中添加日期精确度选择：

```tsx
<Select value={datePrecision}>
  <option value="exact">精确日期</option>
  <option value="month">日期待定</option>
  <option value="quarter">季度待定</option>
  <option value="year">年度待定</option>
</Select>
```

## 查询建议

### 按月份筛选不确定事件

```sql
SELECT * FROM events
WHERE date_precision = 'month'
AND approximate_month = '2024-03';
```

### 获取所有待定事件

```sql
SELECT * FROM events
WHERE date_precision != 'exact'
ORDER BY approximate_month;
```

## 注意事项

1. **时间字段必填**: 即使是日期待定，`startTime` 和 `endTime` 也需要填写（建议设为月初）
2. **索引优化**: `approximate_month` 字段已添加索引，查询性能良好
3. **向后兼容**: 现有事件自动设为 `date_precision='exact'`，不影响现有功能
4. **重复事件**: 不确定日期的事件不建议设置重复规则

## 未来扩展

可考虑的增强功能：
- [ ] 在月视图顶部添加"本月待定事件"提示栏
- [ ] 支持日期范围待定（例如"3月15-20日之间"）
- [ ] 添加"确定日期"按钮，将待定事件转为精确事件
- [ ] 导出时标注待定状态
