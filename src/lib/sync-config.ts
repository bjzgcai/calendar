// Shared sync configuration — safe to import in both server and client code

const DEFAULT_SYNC_USER_IDS = "Qfr1meiPqooG1l2jyZ5zOyQiEiE,e5JiPXxELQAEoNpZ50qLsnwiEiE,IgQRc4KPdJXQiPPBOEl3biiQiEiE"

export const SYNC_USER_IDS = (
  typeof process !== "undefined" && process.env.DINGTALK_SYNC_USER_IDS
    ? process.env.DINGTALK_SYNC_USER_IDS
    : DEFAULT_SYNC_USER_IDS
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)

export const SYNC_USER_NAMES: Record<string, string> = {
  "Qfr1meiPqooG1l2jyZ5zOyQiEiE": "钟泱榆",
  "e5JiPXxELQAEoNpZ50qLsnwiEiE": "杨阳",
  "IgQRc4KPdJXQiPPBOEl3biiQiEiE": "曹丽娜",
}

export const SYNC_USER_DISPLAY_NAMES = SYNC_USER_IDS
  .map((id) => SYNC_USER_NAMES[id] ?? id)
  .join("\\")
