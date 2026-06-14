import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge gate for the authenticated (app) route group: cheap cookie-presence
 * check only. Real session validation happens in the (app) layout and in
 * route handlers via requireUser() — see ARCHITECTURE.md → Auth.
 */
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

// Matches the (app) route group's URLs (route groups don't appear in paths).
export const config = {
  matcher: [
    "/home/:path*",
    "/search/:path*",
    "/library/:path*",
    "/journal/:path*",
    "/track/:path*",
    "/dj/:path*",
    "/playlist/:path*",
    "/taste/:path*",
    "/galaxy/:path*",
  ],
};
