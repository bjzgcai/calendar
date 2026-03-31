---
name: update-sync-users
description: Add DingTalk sync users by name (name -> userId -> unionid), then update SYNC_USER_NAMES safely.
disable-model-invocation: false
allowed-tools: Bash, Read, Edit
---

# Update `SYNC_USER_NAMES` by DingTalk Name

Use this skill when we need to add a user such as `冯杰` to:

- `src/lib/sync-config.ts`
- `SYNC_USER_NAMES: Record<unionid, user_name>`

## Required DingTalk Docs

1. Search `userId` by name:
   - https://open.dingtalk.com/document/development/address-book-search-user-id
2. Query user details by `userId` (get `unionid`):
   - https://open.dingtalk.com/document/development/query-user-details

## Workflow

1. Load `.env` first and get corp `access_token` in this order:
   - Prefer existing `ACCESS_TOKEN` from `.env` if present.
   - Otherwise read `DINGTALK_APP_KEY` + `DINGTALK_APP_SECRET` from `.env`, call token API, and set `ACCESS_TOKEN`.
2. Call "search userId by name" API with the target name (example: `吴衍标` or `冯杰`), collect `userId`.
3. For each `userId`, call "query user details" API to get `unionid`.
4. Update `src/lib/sync-config.ts`:
   - Add `"unionid": "user_name"` to `SYNC_USER_NAMES`.
   - Keep all same-name users (do not deduplicate by name).
5. To detect duplicate names reliably, fetch all users and filter by exact name:
   - `pnpm tsx scripts/test-dingtalk-users.ts --all --detailed`
   - or `GET /api/dingtalk/users?type=all&detailed=true&search=<姓名>`
6. If duplicate names exist, add all users with different `unionid` values.
7. Return a short change summary including:
   - searched name
   - all matched `userId`
   - all added `unionid -> user_name` mappings

## Duplicate Name Rule (Important)

Chinese names often repeat. If multiple users share the same name:

- Add all of them to `SYNC_USER_NAMES`
- Use one entry per `unionid`
- `user_name` can be identical for multiple keys

## Curl Template

```bash
# 0) load .env (first)
set -a
source .env
set +a

# 1) access_token (prefer .env ACCESS_TOKEN, fallback to appkey/appsecret)
if [ -z "$ACCESS_TOKEN" ]; then
  ACCESS_TOKEN=$(curl -sS "https://oapi.dingtalk.com/gettoken?appkey=$DINGTALK_APP_KEY&appsecret=$DINGTALK_APP_SECRET" | jq -r '.access_token')
fi

# 2) search userId by name (from doc #1)
curl -sS "https://oapi.dingtalk.com/topapi/userid/search?access_token=$ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"冯杰"}'

# 3) query user details by userId (from doc #2), read result.unionid
curl -sS "https://oapi.dingtalk.com/topapi/v2/user/get?access_token=$ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userid":"USER_ID"}'
```

## Common Failure

- If token API returns `errcode: 40096` / `Illegal appKey or appSecret`, stop and ask for valid
  `DINGTALK_APP_KEY` + `DINGTALK_APP_SECRET` before editing `sync-config.ts`.

## Local File To Edit

- `src/lib/sync-config.ts`

Add mappings under:

```ts
export const SYNC_USER_NAMES: Record<string, string> = {
  // "unionid": "姓名",
}
```
