import { getCorpAccessToken } from "./dingtalk"

const ROBOT_OTO_BATCH_SEND_URL = "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend"
const MARKDOWN_MSG_KEY = "sampleMarkdown"

type AlertEnv = {
  [key: string]: string | undefined
  DINGTALK_APP_KEY?: string
  ALERT_DINGTALK_USER_ID?: string
}

type AlertMessage = {
  title: string
  text: string
}

type SendDeps = {
  env?: AlertEnv
  fetch?: typeof fetch
  getAccessToken?: () => Promise<string>
}

type DingTalkRobotAlertPayload = {
  robotCode: string
  userIds: string[]
  msgKey: typeof MARKDOWN_MSG_KEY
  msgParam: string
}

export type DingTalkRobotAlertResult =
  | { sent: true; processQueryKey?: string }
  | { sent: false; skippedReason: string }

function parseAlertUserIds(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function buildDingTalkRobotAlertPayload(
  message: AlertMessage,
  env: AlertEnv = process.env
): DingTalkRobotAlertPayload {
  return {
    robotCode: env.DINGTALK_APP_KEY?.trim() ?? "",
    userIds: parseAlertUserIds(env.ALERT_DINGTALK_USER_ID),
    msgKey: MARKDOWN_MSG_KEY,
    msgParam: JSON.stringify({
      title: message.title,
      text: message.text,
    }),
  }
}

export async function sendDingTalkRobotAlert(
  message: AlertMessage,
  deps: SendDeps = {}
): Promise<DingTalkRobotAlertResult> {
  const env = deps.env ?? process.env
  const payload = buildDingTalkRobotAlertPayload(message, env)

  if (!payload.robotCode) {
    return { sent: false, skippedReason: "DINGTALK_APP_KEY is not configured" }
  }

  if (payload.userIds.length === 0) {
    return { sent: false, skippedReason: "ALERT_DINGTALK_USER_ID is not configured" }
  }

  const accessToken = await (deps.getAccessToken ?? getCorpAccessToken)()
  const fetchImpl = deps.fetch ?? fetch
  const response = await fetchImpl(ROBOT_OTO_BATCH_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-acs-dingtalk-access-token": accessToken,
    },
    body: JSON.stringify(payload),
  })

  const responseText = await response.text()
  let responseJson: { processQueryKey?: string; code?: string; message?: string } | null = null
  if (responseText) {
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      responseJson = null
    }
  }

  if (!response.ok) {
    const errorDetail = responseJson?.message ?? responseText
    throw new Error(`Failed to send DingTalk robot alert: HTTP ${response.status}${errorDetail ? ` - ${errorDetail}` : ""}`)
  }

  return { sent: true, processQueryKey: responseJson?.processQueryKey }
}

export function formatFatalAlertMarkdown(input: {
  title: string
  source: string
  fatalInfo: string
  occurredAt?: Date
}) {
  const occurredAt = input.occurredAt ?? new Date()
  return [
    `### ${input.title}`,
    "",
    `- Source: ${input.source}`,
    `- Time: ${occurredAt.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}`,
    "",
    "#### Fatal info",
    "```text",
    input.fatalInfo.slice(0, 6000),
    "```",
  ].join("\n")
}

export async function notifyDingTalkFatalAlert(input: {
  title: string
  source: string
  fatalInfo: string
}) {
  try {
    const result = await sendDingTalkRobotAlert({
      title: input.title,
      text: formatFatalAlertMarkdown(input),
    })

    if (!result.sent) {
      console.warn(`DingTalk alert skipped: ${result.skippedReason}`)
    }
  } catch (error) {
    console.error("Failed to send DingTalk fatal alert:", error)
  }
}
