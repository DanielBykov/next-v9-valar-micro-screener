import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Sensitive write endpoints that require authentication.
// Admin pages and read-only API routes are public.
const PROTECTED_API_ROUTES = ["/api/admin/clear", "/api/admin/fetch-indicators"];

export const config = {
  matcher: ["/api/admin/:path*"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  if (!isProtected) return NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return new NextResponse(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthed = await verifySessionToken(token, secret);
  if (isAuthed) return NextResponse.next();

  return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
