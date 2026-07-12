import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { resolveRequestId } from "@/lib/request-id";

const PROTECTED_PREFIXES = [
  "/home",
  "/search",
  "/library",
  "/journal",
  "/track",
  "/dj",
  "/playlist",
  "/taste",
  "/galaxy",
  "/rooms",
] as const;

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Adds a safe correlation ID to application/API requests and responses. The
 * page auth gate remains a cheap cookie-presence check; APIs keep returning
 * their standard JSON 401 envelope instead of being redirected.
 */
export function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  let response: NextResponse;
  if (isProtectedPage(request.nextUrl.pathname) && !getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
