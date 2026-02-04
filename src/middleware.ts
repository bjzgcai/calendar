import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData, defaultSession } from "@/lib/session";
import { isDingTalkSSOEnabled } from "@/lib/dingtalk";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/callback",
    "/api/auth/logout",
  ];

  // Allow all API routes to proceed (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    // Only allow auth-related API routes without session check
    if (publicPaths.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // For other API routes, let them handle their own authentication
    return NextResponse.next();
  }

  // If SSO is disabled, allow all page routes without authentication
  if (!isDingTalkSSOEnabled()) {
    return NextResponse.next();
  }

  // For page routes when SSO is enabled, check authentication
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // Check if user is logged in
  if (!session.isLoggedIn) {
    // Redirect to login page for page routes
    const loginUrl = new URL("/api/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
