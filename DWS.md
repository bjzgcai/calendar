
### 远程服务器登录auth
dws auth login --device --client-id <your-app-key> --client-secret <your-app-secret>

### 查看日历
dws calendar event list \
  --start "$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S.000Z)" \
  --end "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
  -f json \
  --jq '.result.events | map(select((.attendees|length) > 50) | {organizer: .organizer.displayName})'