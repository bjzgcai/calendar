import { NextResponse } from "next/server";
import { getSession, SessionData } from "@/lib/session";

export type AuthenticatedSession = {
  session: SessionData;
  userId: number;
};

type AuthResult =
  | { ok: true; data: AuthenticatedSession }
  | { ok: false; response: NextResponse };

export async function requireLoggedIn(message = "Authentication required"): Promise<AuthResult> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 401 }),
    };
  }

  return {
    ok: true,
    data: {
      session,
      userId: session.userId,
    },
  };
}
