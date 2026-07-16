import {
  anthropic,
  NARRATIVE_MODEL,
  isNarrativeConfigured,
  classifyAnthropicError,
  type AiErrorReason,
} from "@/lib/ai/client";

export type AiConfigStatus = {
  configured: boolean;
  model: string;
};

export type AiConnectionResult =
  | { ok: true; model: string }
  | { ok: false; reason: AiErrorReason | "no_api_key"; detail: string };

/** Instant, cost-free: does the environment carry an API key? */
export function getAiConfigStatus(): AiConfigStatus {
  return { configured: isNarrativeConfigured(), model: NARRATIVE_MODEL };
}

/**
 * Actively verify the key against the Anthropic API. Uses countTokens — an
 * authenticated endpoint that spends no output tokens — so it definitively
 * distinguishes a valid key from a missing/revoked/rate-limited one without
 * incurring generation cost.
 */
export async function testAiConnection(): Promise<AiConnectionResult> {
  if (!isNarrativeConfigured()) {
    return { ok: false, reason: "no_api_key", detail: "ANTHROPIC_API_KEY is not set" };
  }
  try {
    await anthropic.messages.countTokens({
      model: NARRATIVE_MODEL,
      messages: [{ role: "user", content: "ping" }],
    });
    return { ok: true, model: NARRATIVE_MODEL };
  } catch (err) {
    const { reason, detail } = classifyAnthropicError(err);
    return { ok: false, reason, detail };
  }
}
