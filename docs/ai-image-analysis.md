# AI Image Analysis Feature

## Overview
This feature uses Qwen VL Plus (via OpenRouter) to automatically extract event information from uploaded poster images when creating events.

## How It Works

1. **User uploads an image** in the "创建活动" (Create Event) form
2. **Image is uploaded** to the server (local storage or S3)
3. **AI analysis is triggered** automatically
4. **Event information is extracted** from the image, including:
   - Event title
   - Event description/content
   - Date and time
   - Location
   - Organizers
   - Event type
   - Tags
   - Registration/event link

5. **Form fields are auto-filled** with the extracted information (only empty fields)

## Configuration

### Required Environment Variable
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

Add your OpenRouter API key to `.env` file.

### API Model
- Model: `qwen/qwen-vl-plus`
- API: OpenRouter (https://openrouter.ai)

## Technical Details

### API Endpoint
**POST** `/api/analyze-image`

Request body:
```json
{
  "imageUrl": "/api/posters/1234567890_poster.jpg"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "title": "活动标题",
    "content": "活动详细描述",
    "date": "2024-03-15",
    "startTime": "14:00",
    "endTime": "16:00",
    "location": "会议室A",
    "organizers": ["创新创业中心", "学生社团"],
    "eventType": "academic_research",
    "tags": ["#讲座#", "#直播#"],
    "link": "https://example.com",
    "datePrecision": "exact"
  }
}
```

### Event Type Mapping
Chinese labels are automatically mapped to English keys:
- 学术研究 → `academic_research`
- 教学培训 → `teaching_training`
- 学生活动 → `student_activities`
- 产学研合作 → `industry_academia`
- 行政管理 → `administration`
- 重要节点 → `important_deadlines`

### Date Precision Handling
- `exact`: Full date with time (YYYY-MM-DD + HH:MM)
- `month`: Only month is known (YYYY-MM)

## User Experience

### Visual Feedback
When uploading an image:
1. "上传中..." (Uploading...) - during file upload
2. "AI分析中..." (AI analyzing...) - during image analysis
3. Form fields auto-populate after analysis completes

### Smart Auto-Fill
- **Only fills empty fields** - preserves user-entered data
- **Preserves existing selections** - doesn't override organizers/types already selected
- **Graceful fallback** - if analysis fails, user can still fill form manually

## Error Handling

The system gracefully handles errors:
- Missing API key → Returns 500 error
- Invalid image URL → Returns 400 error
- AI analysis failure → Logs error, continues without auto-fill
- Invalid AI response → Logs error, continues without auto-fill

Errors are logged to console but don't block the user from creating events manually.

## Cost Considerations

- Model: Qwen VL Plus via OpenRouter
- Cost per image analysis: ~$0.002-0.005 (check OpenRouter pricing)
- Only triggered when user uploads an image
- Consider monitoring API usage if expecting high volume

## Future Improvements

Potential enhancements:
- [ ] Add support for batch image analysis
- [ ] Allow user to re-analyze if AI missed information
- [ ] Add confidence scores for extracted fields
- [ ] Support multiple languages in extraction
- [ ] Cache analysis results to avoid re-analyzing same images
