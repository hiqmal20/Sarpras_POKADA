import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lindungi rute /admin dan /user di level server/edge
  if (pathname.startsWith("/admin") || pathname.startsWith("/user")) {
    const accessToken = request.cookies.get("access_token")?.value;
    const refreshToken = request.cookies.get("refresh_token")?.value;

    // Jika cookie sesi auth tidak ada sama sekali, cegah render dan alihkan ke login
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/auth/login", request.url);
      const reason = request.nextUrl.searchParams.get("reason");
      if (reason) {
        loginUrl.searchParams.set("reason", reason);
      }
      const response = NextResponse.redirect(loginUrl);
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
