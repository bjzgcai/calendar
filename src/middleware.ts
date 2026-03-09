import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  // All page routes are accessible in read-only mode without authentication.
  // Edit permissions are enforced client-side based on SSO login state.
  return NextResponse.next();
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
