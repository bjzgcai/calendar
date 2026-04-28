import assert from "node:assert/strict"
import test from "node:test"

import {
  summarizeLogLines,
  tailLines,
  buildMonitoringEnvStatus,
  isMonitoringAuthBypassEnabled,
} from "../../src/lib/monitoring"

test("tailLines returns the newest non-empty lines up to the requested limit", () => {
  assert.deepEqual(tailLines("first\nsecond\nthird\n", 2), ["second", "third"])
})

test("summarizeLogLines counts failures and returns the newest matching line", () => {
  const summary = summarizeLogLines([
    "calendar service monitor: healthy",
    "HTTP check failed for http://127.0.0.1:5002/; status=500",
    "DingTalk sync failed for user MXsvR7",
  ])

  assert.deepEqual(summary, {
    errorCount: 2,
    lastErrorLine: "DingTalk sync failed for user MXsvR7",
  })
})

test("buildMonitoringEnvStatus exposes configuration presence without secrets", () => {
  assert.deepEqual(
    buildMonitoringEnvStatus({
      DINGTALK_APP_KEY: "ding-secret",
      DINGTALK_APP_SECRET: "app-secret",
      ALERT_DINGTALK_USER_ID: "175239469",
      THIRD_PARTY_API_KEY: "sync-secret",
      MONITOR_PM2_APP_NAME: "calendar",
    }),
    {
      dingtalkAppKeyConfigured: true,
      dingtalkAppSecretConfigured: true,
      alertUserConfigured: true,
      internalApiKeyConfigured: true,
      pm2AppName: "calendar",
    }
  )
})

test("isMonitoringAuthBypassEnabled only allows the dev-script flag outside production", () => {
  assert.equal(
    isMonitoringAuthBypassEnabled({
      MONITORING_DEV_AUTH_BYPASS: "true",
      NODE_ENV: "development",
    }),
    true
  )

  assert.equal(
    isMonitoringAuthBypassEnabled({
      MONITORING_DEV_AUTH_BYPASS: "true",
      NODE_ENV: "production",
    }),
    false
  )

  assert.equal(
    isMonitoringAuthBypassEnabled({
      NODE_ENV: "development",
    }),
    false
  )
})
