import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDwsSyncUserResolverFailureAlert,
  buildDingTalkRobotAlertPayload,
  sendDingTalkRobotAlert,
} from "../../src/lib/dingtalk-alerts"

test("DingTalk robot alert payload uses app key as robotCode and alert user IDs", () => {
  const payload = buildDingTalkRobotAlertPayload(
    {
      title: "服务告警",
      text: "### 服务告警\n\nbackend failed",
    },
    {
      DINGTALK_APP_KEY: "ding88rhjr15416chn0d",
      ALERT_DINGTALK_USER_ID: "175239469, 123",
    }
  )

  assert.deepEqual(payload, {
    robotCode: "ding88rhjr15416chn0d",
    userIds: ["175239469", "123"],
    msgKey: "sampleMarkdown",
    msgParam: JSON.stringify({
      title: "服务告警",
      text: "### 服务告警\n\nbackend failed",
    }),
  })
})

test("DingTalk robot alert sender posts to the OTO batch send API", async () => {
  const requests: Array<{ url: string; init: RequestInit }> = []

  const result = await sendDingTalkRobotAlert(
    {
      title: "日历服务告警",
      text: "frontend failed",
    },
    {
      env: {
        DINGTALK_APP_KEY: "ding88rhjr15416chn0d",
        ALERT_DINGTALK_USER_ID: "175239469",
      },
      getAccessToken: async () => "corp-token",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} })
        return new Response(JSON.stringify({ processQueryKey: "query-key" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      },
    }
  )

  assert.equal(result.sent, true)
  assert.equal(result.processQueryKey, "query-key")
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend")
  assert.equal((requests[0].init.headers as Record<string, string>)["x-acs-dingtalk-access-token"], "corp-token")
  assert.equal(requests[0].init.method, "POST")
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), {
    robotCode: "ding88rhjr15416chn0d",
    userIds: ["175239469"],
    msgKey: "sampleMarkdown",
    msgParam: JSON.stringify({
      title: "日历服务告警",
      text: "frontend failed",
    }),
  })
})

test("DingTalk robot alert sender skips when recipient is not configured", async () => {
  const result = await sendDingTalkRobotAlert(
    { title: "服务告警", text: "backend failed" },
    {
      env: { DINGTALK_APP_KEY: "ding88rhjr15416chn0d" },
      getAccessToken: async () => "corp-token",
      fetch: async () => {
        throw new Error("fetch should not be called")
      },
    }
  )

  assert.deepEqual(result, {
    sent: false,
    skippedReason: "ALERT_DINGTALK_USER_ID is not configured",
  })
})

test("DWS sync user resolver failure alert includes command output", () => {
  const alert = buildDwsSyncUserResolverFailureAlert({
    message: "Command failed: dws calendar event list",
    stdout: JSON.stringify({
      error: {
        reason: "not_authenticated",
        message: "未登录，请先执行 dws auth login",
      },
    }),
    stderr: "",
  })

  assert.equal(alert.title, "DWS sync user resolver failed")
  assert.equal(alert.source, "sync-users-resolver")
  assert.match(alert.fatalInfo, /Command failed: dws calendar event list/)
  assert.match(alert.fatalInfo, /not_authenticated/)
  assert.match(alert.fatalInfo, /dws auth login/)
})
