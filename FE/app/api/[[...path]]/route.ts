import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const backendBase = process.env.BACKEND_URL || "http://localhost:5000";
  const pathSegment = path && path.length > 0 ? path.join("/") : "";
  const targetUrl = new URL(
    pathSegment ? `/api/${pathSegment}` : "/api",
    backendBase
  );
  targetUrl.search = request.nextUrl.search;

  const reqHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      reqHeaders.set(key, value);
    }
  });

  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const backendRes = await fetch(targetUrl.toString(), {
      method,
      headers: reqHeaders,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      if (
        !HOP_BY_HOP_HEADERS.has(key.toLowerCase()) &&
        key.toLowerCase() !== "set-cookie"
      ) {
        resHeaders.set(key, value);
      }
    });

    const response = new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });

    if (typeof backendRes.headers.getSetCookie === "function") {
      const cookies = backendRes.headers.getSetCookie();
      for (const cookie of cookies) {
        response.headers.append("set-cookie", cookie);
      }
    } else {
      const cookie = backendRes.headers.get("set-cookie");
      if (cookie) {
        response.headers.set("set-cookie", cookie);
      }
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal menghubungi layanan backend internal",
        detail: error?.message,
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
