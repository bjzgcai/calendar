#!/usr/bin/env bash
set -uo pipefail

# Monitor the remote calendar service and notify ALERT_DINGTALK_USER_ID by
# DingTalk OTO robot message when either the frontend or API path is unhealthy.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"
LOG_DIR="${PROJECT_ROOT}/logs"
STATE_FILE="${LOG_DIR}/service-monitor-state"
ALERT_SCRIPT="${SCRIPT_DIR}/dingtalk-robot-alert.sh"

mkdir -p "$LOG_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

APP_PORT="${PORT:-5002}"
PM2_APP_NAME="${MONITOR_PM2_APP_NAME:-calendar}"
FRONTEND_URL="${MONITOR_FRONTEND_URL:-http://127.0.0.1:${APP_PORT}/}"
BACKEND_URL="${MONITOR_BACKEND_URL:-http://127.0.0.1:${APP_PORT}/api/auth/config}"
COOLDOWN_SECONDS="${ALERT_MONITOR_COOLDOWN_SECONDS:-1800}"

now_epoch() {
  date +%s
}

check_http() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 8 "$url" 2>/dev/null || true)"

  if [[ "$code" =~ ^[23][0-9][0-9]$ ]]; then
    return 0
  fi

  echo "HTTP check failed for ${url}; status=${code:-curl_failed}"
  return 1
}

check_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "pm2 command not found"
    return 1
  fi

  local pm2_json status
  pm2_json="$(pm2 jlist 2>/dev/null || echo "[]")"
  status="$(
    PM2_APP_NAME="$PM2_APP_NAME" PM2_JSON="$pm2_json" node - <<'NODE' 2>/dev/null || true
try {
  const apps = JSON.parse(process.env.PM2_JSON || "[]")
  const app = apps.find((item) => item.name === process.env.PM2_APP_NAME)
  process.stdout.write(app?.pm2_env?.status || "missing")
} catch {
  process.stdout.write("parse_error")
}
NODE
  )"

  if [[ "$status" == "online" ]]; then
    return 0
  fi

  echo "PM2 app ${PM2_APP_NAME} is ${status:-unknown}"
  return 1
}

append_command_output() {
  local title="$1"
  shift

  echo
  echo "### ${title}"
  "$@" 2>&1 | tail -n 80 || true
}

should_send_alert() {
  local current_time="$1"

  if [[ ! -f "$STATE_FILE" ]]; then
    return 0
  fi

  local last_status last_alert_at
  last_status="$(sed -n '1p' "$STATE_FILE")"
  last_alert_at="$(sed -n '2p' "$STATE_FILE")"

  if [[ "$last_status" != "unhealthy" ]]; then
    return 0
  fi

  if [[ -z "$last_alert_at" || $((current_time - last_alert_at)) -ge "$COOLDOWN_SECONDS" ]]; then
    return 0
  fi

  return 1
}

record_state() {
  local status="$1"
  local alert_at="${2:-}"
  {
    echo "$status"
    echo "$alert_at"
  } > "$STATE_FILE"
}

main() {
  local failures=()
  local failure

  failure="$(check_pm2)" || failures+=("$failure")
  failure="$(check_http "$FRONTEND_URL")" || failures+=("frontend: $failure")
  failure="$(check_http "$BACKEND_URL")" || failures+=("backend: $failure")

  if [[ ${#failures[@]} -eq 0 ]]; then
    record_state "healthy" ""
    echo "calendar service monitor: healthy"
    return 0
  fi

  local current_time
  current_time="$(now_epoch)"

  if ! should_send_alert "$current_time"; then
    echo "calendar service monitor: unhealthy, alert suppressed by cooldown"
    return 1
  fi

  local hostname_value
  hostname_value="$(hostname 2>/dev/null || echo unknown)"

  local fatal_info
  fatal_info="$(
    {
      echo "Host: ${hostname_value}"
      echo "Time: $(TZ=Asia/Shanghai date '+%Y-%m-%d %H:%M:%S %Z')"
      echo "PM2 app: ${PM2_APP_NAME}"
      echo "Frontend URL: ${FRONTEND_URL}"
      echo "Backend URL: ${BACKEND_URL}"
      echo
      echo "Failures:"
      printf -- "- %s\n" "${failures[@]}"
      append_command_output "pm2 status" pm2 status
      append_command_output "pm2 recent logs" pm2 logs "$PM2_APP_NAME" --lines 60 --nostream
      append_command_output "listening ports" ss -ltnp
      append_command_output "disk usage" df -h
    } | head -c 6000
  )"

  if [[ ! -f "$ALERT_SCRIPT" ]]; then
    echo "alert script not found: $ALERT_SCRIPT"
    return 1
  fi

  # shellcheck disable=SC1090
  . "$ALERT_SCRIPT"

  send_dingtalk_robot_markdown_alert \
    "Calendar service fatal alert" \
    "### Calendar service fatal alert

\`\`\`text
${fatal_info}
\`\`\`"

  record_state "unhealthy" "$current_time"
  echo "calendar service monitor: alert sent"
  return 1
}

main "$@"
