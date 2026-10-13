import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL("/auth/login", request.url);
  const reason = request.nextUrl.searchParams.get("reason");
  if (reason) loginUrl.searchParams.set("reason", reason);

  const response = NextResponse.redirect(loginUrl);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

const redirectToUserDashboard = (request: NextRequest) => {
  const response = NextResponse.redirect(new URL("/user/dashboard", request.url));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return response;
};

async function getVerifiedUser(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/me`, {
      method: "GET",
      headers: { cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const body = await response.json();
    return body?.status === "success" ? body.data?.user || null : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/user")) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(
    request.cookies.get("access_token")?.value || request.cookies.get("refresh_token")?.value
  );
  if (!hasSessionCookie) return redirectToLogin(request);

  // Backend remains the source of truth for token validity, account status, and role.
  const verifiedUser = await getVerifiedUser(request);
  if (!verifiedUser) return redirectToLogin(request);

  if (pathname.startsWith("/admin") && !["Admin", "Petugas"].includes(verifiedUser.role)) {
    return redirectToUserDashboard(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
