import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export interface SessionData {
  userId?: number;
  dingtalkUserId?: string;
  name?: string;
  avatar?: string;
  email?: string;
  oauthState?: string;
  oauthStateExpiresAt?: number;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

const SESSION_SECRET = process.env.SESSION_SECRET;
const HAS_VALID_SESSION_SECRET = Boolean(SESSION_SECRET && SESSION_SECRET.length >= 32);
const DEV_FALLBACK_SECRET = randomBytes(32).toString("hex");

if (!HAS_VALID_SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long in production.");
  }
  console.warn("[session] SESSION_SECRET is missing or too short; using an ephemeral dev-only secret.");
}

export const sessionOptions: SessionOptions = {
  password: HAS_VALID_SESSION_SECRET ? SESSION_SECRET! : DEV_FALLBACK_SECRET,
  cookieName: "dingtalk_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production" || process.env.SESSION_SECURE === "true",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  },
};

export async function getSession() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  return session;
}
