#!/usr/bin/env bash
set -euo pipefail

# Install/update the hourly DingTalk sync cron job for the current user.
# The API key is read from .env at runtime so crontab does not store secrets.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/dingtalk-sync.log"

mkdir -p "$PROJECT_ROOT/logs"

CRON_COMMAND="7 * * * * cd $PROJECT_ROOT && bash -lc 'set -a; . ./.env; set +a; : \"\${THIRD_PARTY_API_KEY:?THIRD_PARTY_API_KEY is required}\"; curl -s -X POST -H \"x-api-key: \$THIRD_PARTY_API_KEY\" http://127.0.0.1:5002/api/dingtalk/sync >> $LOG_FILE 2>&1'"

(crontab -l 2>/dev/null | grep -v "/api/dingtalk/sync" || true; echo "$CRON_COMMAND") | crontab -

echo "Installed DingTalk sync cron:"
crontab -l | grep "/api/dingtalk/sync"
