import { NextRequest } from "next/server";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getAppBaseUrl(request: NextRequest): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  return trimTrailingSlash(request.nextUrl.origin);
}
