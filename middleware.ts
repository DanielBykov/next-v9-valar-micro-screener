import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return new NextResponse("Server misconfiguration: ADMIN_SESSION_SECRET not set", { status: 500 });
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthed = await verifySessionToken(token, secret);
  if (isAuthed) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
