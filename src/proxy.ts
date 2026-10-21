import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: private areas require a session cookie, otherwise redirect to login.
 * This is NOT the security boundary — every page and action re-validates the session and
 * permissions against the database on the server.
 */
export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("vendo_session");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/post/:path*", "/post"],
};
