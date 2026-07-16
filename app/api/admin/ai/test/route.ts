import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { testAiConnection } from "@/lib/ai/health";

/**
 * On-demand connection probe. Verifies the API key against Anthropic via a
 * token-count call (no output-token cost). Always HTTP 200 — the payload's
 * `ok` field carries the verdict so the client renders a status, not an error.
 */
export async function POST(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const result = await testAiConnection();
  return NextResponse.json(result);
}
