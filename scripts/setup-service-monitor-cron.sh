#!/usr/bin/env bash
set -euo pipefail

# Install/update the service monitor cron job for the current user.
# Secrets are loaded from .env at monitor runtime, not stored in crontab.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/service-monitor.log"

mkdir -p "$PROJECT_ROOT/logs"

CRON_COMMAND="*/5 * * * * cd $PROJECT_ROOT && bash ./scripts/monitor-remote-services.sh >> $LOG_FILE 2>&1"

(crontab -l 2>/dev/null | grep -v "monitor-remote-services.sh" || true; echo "$CRON_COMMAND") | crontab -

echo "Installed service monitor cron:"
crontab -l | grep "monitor-remote-services.sh"
