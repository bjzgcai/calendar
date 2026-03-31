/**
 * DingTalk OAuth 工具函数
 */

// DingTalk API 基础 URL
const DINGTALK_API_BASE = "https://api.dingtalk.com"; // v1.0 新版 API
const DINGTALK_OAPI_BASE = "https://oapi.dingtalk.com"; // 旧版 API
const DINGTALK_LOGIN_BASE = "https://login.dingtalk.com";

// 环境变量
const DINGTALK_APP_KEY = process.env.DINGTALK_APP_KEY?.trim() || "";
const DINGTALK_APP_SECRET = process.env.DINGTALK_APP_SECRET?.trim() || "";

/**
 * 检查 DingTalk SSO 是否启用
 * 默认为关闭状态
 */
export function isDingTalkSSOEnabled(): boolean {
  return process.env.ENABLE_DINGTALK_SSO === "true";
}

/**
 * 获取 DingTalk 登录授权 URL
 */
export function getDingTalkAuthUrl(redirectUri: string, state: string = "STATE") {
  const params = new URLSearchParams({
    client_id: DINGTALK_APP_KEY,
    response_type: "code",
    scope: "openid corpid",
    state: state,
    redirect_uri: redirectUri,
    prompt: "consent",
  });

  return `${DINGTALK_LOGIN_BASE}/oauth2/auth?${params.toString()}`;
}

/**
 * 使用授权码获取访问令牌
 */
export async function getAccessToken(code: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token: string;
}> {
  const body = {
    clientId: DINGTALK_APP_KEY,
    clientSecret: DINGTALK_APP_SECRET,
    code: code,
    grantType: "authorization_code",
  };

  const response = await fetch(`${DINGTALK_API_BASE}/v1.0/oauth2/userAccessToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("DingTalk token response error:", error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  console.log("DingTalk token response:", JSON.stringify(data, null, 2));

  // DingTalk API uses camelCase in response (accessToken, not access_token)
  return {
    access_token: data.accessToken || data.access_token,
    expires_in: data.expireIn || data.expires_in,
    refresh_token: data.refreshToken || data.refresh_token,
  };
}

/**
 * 获取用户信息
 */
export async function getUserInfo(accessToken: string): Promise<{
  nick: string;
  unionId: string;
  openId: string;
  avatarUrl?: string;
  mobile?: string;
  email?: string;
}> {
  const response = await fetch(`${DINGTALK_API_BASE}/v1.0/contact/users/me`, {
    method: "GET",
    headers: {
      "x-acs-dingtalk-access-token": accessToken,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("DingTalk user info response error:", error);
    throw new Error(`Failed to get user info: ${error}`);
  }

  const data = await response.json();
  console.log("DingTalk user info response:", JSON.stringify(data, null, 2));

  // Handle both direct response and nested response formats
  const userInfo = data.result || data;

  if (!userInfo.openId && !userInfo.unionid) {
    console.error("Invalid user info structure:", data);
    throw new Error("Invalid user info response from DingTalk");
  }

  return {
    nick: userInfo.nick || userInfo.name || "DingTalk User",
    unionId: userInfo.unionId || userInfo.unionid,
    openId: userInfo.openId || userInfo.userid,
    avatarUrl: userInfo.avatarUrl || userInfo.avatar,
    mobile: userInfo.mobile,
    email: userInfo.email,
  };
}

/**
 * 获取企业内部应用的 access_token (用于调用企业内部 API)
 */
export async function getCorpAccessToken(): Promise<string> {
  if (!DINGTALK_APP_KEY || !DINGTALK_APP_SECRET) {
    throw new Error("Missing DingTalk app credentials. Set DINGTALK_APP_KEY and DINGTALK_APP_SECRET.");
  }

  const params = new URLSearchParams({
    appkey: DINGTALK_APP_KEY,
    appsecret: DINGTALK_APP_SECRET,
  });

  const response = await fetch(`${DINGTALK_OAPI_BASE}/gettoken?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get corp access token: ${error}`);
  }

  const data = await response.json();

  if (data.errcode !== 0) {
    throw new Error(
      `DingTalk API error: ${data.errmsg} (code: ${data.errcode}, appKey: ${DINGTALK_APP_KEY.slice(0, 6)}...)`
    );
  }

  return data.access_token;
}

/**
 * 获取用户详细信息（企业内部）
 */
export async function getUserDetailByUserId(corpAccessToken: string, userId: string) {
  const response = await fetch(`${DINGTALK_OAPI_BASE}/topapi/v2/user/get`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userid: userId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user detail: ${error}`);
  }

  return response.json();
}

/**
 * 获取部门用户列表（简化版）
 */
export async function getDepartmentUserList(corpAccessToken: string, deptId: number = 1, cursor: number = 0, size: number = 100) {
  const params = new URLSearchParams({
    access_token: corpAccessToken,
  });

  const response = await fetch(`${DINGTALK_OAPI_BASE}/topapi/user/listsimple?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dept_id: deptId,
      cursor: cursor,
      size: size,
      language: "zh_CN",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get department user list: ${error}`);
  }

  const data = await response.json();

  if (data.errcode !== 0) {
    throw new Error(`DingTalk API error: ${data.errmsg} (code: ${data.errcode})`);
  }

  return data.result;
}

/**
 * 获取部门详细用户列表
 */
export async function getDepartmentUserDetailList(corpAccessToken: string, deptId: number = 1, cursor: number = 0, size: number = 100) {
  const params = new URLSearchParams({
    access_token: corpAccessToken,
  });

  const response = await fetch(`${DINGTALK_OAPI_BASE}/topapi/v2/user/list?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dept_id: deptId,
      cursor: cursor,
      size: size,
      language: "zh_CN",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get department user detail list: ${error}`);
  }

  const data = await response.json();

  if (data.errcode !== 0) {
    throw new Error(`DingTalk API error: ${data.errmsg} (code: ${data.errcode})`);
  }

  return data.result;
}

/**
 * 获取所有部门列表
 */
export async function getDepartmentList(corpAccessToken: string, deptId?: number) {
  const params = new URLSearchParams({
    access_token: corpAccessToken,
  });

  const body: any = {
    language: "zh_CN",
  };

  if (deptId !== undefined) {
    body.dept_id = deptId;
  }

  const response = await fetch(`${DINGTALK_OAPI_BASE}/topapi/v2/department/listsub?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get department list: ${error}`);
  }

  const data = await response.json();

  if (data.errcode !== 0) {
    throw new Error(`DingTalk API error: ${data.errmsg} (code: ${data.errcode})`);
  }

  return data.result;
}

// ========================
// Calendar API
// ========================

export interface DingTalkCalendarEventDateTime {
  dateTime?: string  // ISO8601, e.g. "2024-01-01T10:00:00+08:00"
  date?: string      // YYYY-MM-DD for all-day events
  timeZone?: string
}

export interface DingTalkCalendarEvent {
  id: string
  calendarId: string
  summary: string
  description?: string
  location?: string
  start: DingTalkCalendarEventDateTime
  end: DingTalkCalendarEventDateTime
  isAllDay?: boolean
  status?: string  // "confirmed" | "cancelled"
  organizer?: { id: string; displayName: string; self?: boolean }
  attendees?: Array<{ id: string; displayName: string; self?: boolean; responseStatus?: string }>
  createTime?: string
  updateTime?: string
  recurrence?: string[]
}

export interface DingTalkCalendarEventsResult {
  events: DingTalkCalendarEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

/**
 * 通过企业 corp access token + 员工 staffId 获取用户的 openId
 */
export async function getUserOpenIdByStaffId(corpAccessToken: string, staffId: string): Promise<string> {
  const response = await fetch(`${DINGTALK_API_BASE}/v1.0/contact/users/${staffId}`, {
    method: "GET",
    headers: {
      "x-acs-dingtalk-access-token": corpAccessToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user by staffId ${staffId}: ${error}`)
  }

  const data = await response.json()
  const openId = data.openId || data.result?.openId
  if (!openId) {
    throw new Error(`No openId found for staffId ${staffId}: ${JSON.stringify(data)}`)
  }
  return openId
}

/**
 * 获取用户日历事件列表
 * @param accessToken 用户访问令牌或企业访问令牌
 * @param userId 用户 openId（使用用户自己的令牌时可传 "me"）
 * @param calendarId 日历 ID，默认 "primary"
 * @param options 查询选项
 */
export async function getUserCalendarEvents(
  accessToken: string,
  userId: string,
  calendarId: string = "primary",
  options: {
    timeMin?: string   // ISO8601
    timeMax?: string   // ISO8601
    pageToken?: string
    maxResults?: number
    syncToken?: string
  } = {}
): Promise<DingTalkCalendarEventsResult> {
  const params = new URLSearchParams()
  if (options.timeMin) params.set("timeMin", options.timeMin)
  if (options.timeMax) params.set("timeMax", options.timeMax)
  if (options.pageToken) params.set("pageToken", options.pageToken)
  if (options.maxResults) params.set("maxResults", String(options.maxResults))
  if (options.syncToken) params.set("syncToken", options.syncToken)

  const url = `${DINGTALK_API_BASE}/v1.0/calendar/users/${userId}/calendars/${calendarId}/events?${params.toString()}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-acs-dingtalk-access-token": accessToken,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get calendar events for user ${userId}: ${error}`)
  }

  const data = await response.json()
  return {
    events: data.events || [],
    nextPageToken: data.nextPageToken,
    nextSyncToken: data.nextSyncToken,
  }
}

/**
 * 分页获取用户所有日历事件（自动翻页）
 */
export async function getAllUserCalendarEvents(
  accessToken: string,
  userId: string,
  options: { timeMin?: string; timeMax?: string; calendarId?: string } = {}
): Promise<DingTalkCalendarEvent[]> {
  const { calendarId = "primary", ...queryOptions } = options
  const allEvents: DingTalkCalendarEvent[] = []
  let pageToken: string | undefined

  do {
    const result = await getUserCalendarEvents(accessToken, userId, calendarId, {
      ...queryOptions,
      maxResults: 50,
      pageToken,
    })
    allEvents.push(...result.events)
    pageToken = result.nextPageToken
  } while (pageToken)

  return allEvents
}

/**
 * 获取整个组织的所有用户（递归获取所有部门）
 */
export async function getAllUsers(corpAccessToken: string, detailed: boolean = false) {
  const allUsers: any[] = [];
  const processedDepts = new Set<number>();
  const deptsToProcess = [1]; // 从根部门开始

  while (deptsToProcess.length > 0) {
    const currentDeptId = deptsToProcess.pop()!;

    if (processedDepts.has(currentDeptId)) {
      continue;
    }
    processedDepts.add(currentDeptId);

    // 获取当前部门的用户
    let cursor = 0;
    let hasMore = true;

    while (hasMore) {
      const result = detailed
        ? await getDepartmentUserDetailList(corpAccessToken, currentDeptId, cursor, 100)
        : await getDepartmentUserList(corpAccessToken, currentDeptId, cursor, 100);

      if (result.list && result.list.length > 0) {
        allUsers.push(...result.list);
      }

      hasMore = result.has_more;
      cursor = result.next_cursor;
    }

    // 获取子部门
    try {
      const subDepts = await getDepartmentList(corpAccessToken, currentDeptId);
      if (subDepts && subDepts.length > 0) {
        deptsToProcess.push(...subDepts.map((dept: any) => dept.dept_id));
      }
    } catch (error) {
      console.error(`Error getting sub departments for dept ${currentDeptId}:`, error);
    }
  }

  // 去重（根据 userid）
  const uniqueUsers = Array.from(
    new Map(allUsers.map(user => [user.userid, user])).values()
  );

  return uniqueUsers;
}
