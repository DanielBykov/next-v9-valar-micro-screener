const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.byteLength; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64urlEncode(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = await hmac(secret, payload);
  if (!timingSafeEqual(sig, expected)) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return true;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

/**
 * Check session cookie from a Request. Returns null if authenticated,
 * or a 401 NextResponse if not. Usage:
 *   const denied = await requireAuth(request);
 *   if (denied) return denied;
 */
export async function requireAuth(req: Request): Promise<Response | null> {
  const { NextResponse } = await import("next/server");
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const token = match?.[1];
  const valid = await verifySessionToken(token, secret);
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
