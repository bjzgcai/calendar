/**
 * DingTalk OAuth 工具函数
 */

// DingTalk API 基础 URL
const DINGTALK_API_BASE = "https://oapi.dingtalk.com";
const DINGTALK_LOGIN_BASE = "https://login.dingtalk.com";

// 环境变量
const DINGTALK_CLIENT_ID = process.env.DINGTALK_CLIENT_ID!;
const DINGTALK_CLIENT_SECRET = process.env.DINGTALK_CLIENT_SECRET!;
const DINGTALK_CORP_ID = process.env.DINGTALK_CORP_ID!;

/**
 * 获取 DingTalk 登录授权 URL
 */
export function getDingTalkAuthUrl(redirectUri: string, state: string = "STATE") {
  const params = new URLSearchParams({
    client_id: DINGTALK_CLIENT_ID,
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
  const params = new URLSearchParams({
    client_id: DINGTALK_CLIENT_ID,
    client_secret: DINGTALK_CLIENT_SECRET,
    code: code,
    grant_type: "authorization_code",
  });

  const response = await fetch(`${DINGTALK_API_BASE}/v1.0/oauth2/userAccessToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
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
  const params = new URLSearchParams({
    appkey: DINGTALK_CLIENT_ID,
    appsecret: DINGTALK_CLIENT_SECRET,
  });

  const response = await fetch(`${DINGTALK_API_BASE}/gettoken?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get corp access token: ${error}`);
  }

  const data = await response.json();

  if (data.errcode !== 0) {
    throw new Error(`DingTalk API error: ${data.errmsg}`);
  }

  return data.access_token;
}

/**
 * 获取用户详细信息（企业内部）
 */
export async function getUserDetailByUserId(corpAccessToken: string, userId: string) {
  const response = await fetch(`${DINGTALK_API_BASE}/topapi/v2/user/get`, {
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
