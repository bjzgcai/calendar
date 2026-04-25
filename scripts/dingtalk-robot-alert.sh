#!/usr/bin/env bash
set -euo pipefail

DINGTALK_ROBOT_OTO_BATCH_SEND_URL="https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend"

send_dingtalk_robot_markdown_alert() {
  local title="$1"
  local text="$2"

  : "${DINGTALK_APP_KEY:?DINGTALK_APP_KEY is required}"
  : "${DINGTALK_APP_SECRET:?DINGTALK_APP_SECRET is required}"
  : "${ALERT_DINGTALK_USER_ID:?ALERT_DINGTALK_USER_ID is required}"

  local token_response
  token_response="$(
    curl -fsS \
      "https://oapi.dingtalk.com/gettoken?appkey=${DINGTALK_APP_KEY}&appsecret=${DINGTALK_APP_SECRET}"
  )"

  local access_token
  access_token="$(
    TOKEN_RESPONSE="$token_response" node - <<'NODE'
const payload = JSON.parse(process.env.TOKEN_RESPONSE || "{}")
if (payload.errcode && payload.errcode !== 0) {
  throw new Error(`${payload.errmsg || "DingTalk token error"} (code: ${payload.errcode})`)
}
const token = payload.access_token
if (!token) throw new Error("DingTalk access_token missing from token response")
process.stdout.write(token)
NODE
  )"

  local msg_param
  msg_param="$(
    TITLE="$title" TEXT="$text" node - <<'NODE'
process.stdout.write(JSON.stringify({
  title: process.env.TITLE || "",
  text: process.env.TEXT || "",
}))
NODE
  )"

  local payload
  payload="$(
    ROBOT_CODE="$DINGTALK_APP_KEY" USER_IDS="$ALERT_DINGTALK_USER_ID" MSG_PARAM="$msg_param" node - <<'NODE'
const userIds = (process.env.USER_IDS || "")
  .split(/[,\s]+/)
  .map((value) => value.trim())
  .filter(Boolean)

if (userIds.length === 0) {
  throw new Error("ALERT_DINGTALK_USER_ID did not contain any user IDs")
}

process.stdout.write(JSON.stringify({
  robotCode: process.env.ROBOT_CODE,
  userIds,
  msgKey: "sampleMarkdown",
  msgParam: process.env.MSG_PARAM,
}))
NODE
  )"

  curl -fsS \
    -X POST "$DINGTALK_ROBOT_OTO_BATCH_SEND_URL" \
    -H "Content-Type: application/json" \
    -H "x-acs-dingtalk-access-token: ${access_token}" \
    --data-raw "$payload"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  send_dingtalk_robot_markdown_alert "${1:?title is required}" "${2:?text is required}"
  echo
fi
