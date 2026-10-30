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

function tryDecodeToken(token?: string) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.user_metadata?.role || payload.app_metadata?.role || "Mahasiswa",
    };
  } catch {
    return null;
  }
}

async function getVerifiedUser(request: NextRequest, token?: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const headers: Record<string, string> = {
      cookie: request.headers.get("cookie") || "",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/me`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    if (!response.ok) {
      return tryDecodeToken(token);
    }

    const body = await response.json();
    return body?.status === "success" ? body.data?.user || null : null;
  } catch {
    return tryDecodeToken(token);
  } finally {
    clearTimeout(timeout);
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/user")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!token && !refreshToken) {
    return redirectToLogin(request);
  }

  // Backend remains the source of truth for token validity, account status, and role.
  const verifiedUser = await getVerifiedUser(request, token);
  if (!verifiedUser) return redirectToLogin(request);

  if (pathname.startsWith("/admin") && !["Admin", "Petugas"].includes(verifiedUser.role)) {
    return redirectToUserDashboard(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
