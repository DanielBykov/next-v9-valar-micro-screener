import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAiConfigStatus } from "@/lib/ai/health";

/** Instant config check for the admin AI diagnostics card. No API call. */
export async function GET(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  return NextResponse.json(getAiConfigStatus());
}
