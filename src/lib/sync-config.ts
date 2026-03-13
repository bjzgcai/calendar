// Shared sync configuration — safe to import in both server and client code

export const SYNC_USER_NAMES: Record<string, string> = {
  "Qfr1meiPqooG1l2jyZ5zOyQiEiE": "钟泱榆",
  "e5JiPXxELQAEoNpZ50qLsnwiEiE": "杨阳",
  "IgQRc4KPdJXQiPPBOEl3biiQiEiE": "曹丽娜",
  "PBthSFmpvl88mPnwOMPPegiEiE": "李彤",
  "KiitOBaSpDbrfI9Shm1N3WQiEiE": "祁冰琪"
}

export const SYNC_USER_IDS = Object.keys(SYNC_USER_NAMES)

export const SYNC_USER_DISPLAY_NAMES = SYNC_USER_IDS
  .map((id) => SYNC_USER_NAMES[id] ?? id)
  .join("\\")
