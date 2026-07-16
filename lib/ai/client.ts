import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Anthropic client. Reads ANTHROPIC_API_KEY from the environment.
 * Narrative generation is best-effort — callers must tolerate this being
 * unconfigured (see getRegimeNarrative), so we don't throw at import time.
 */
export const anthropic = new Anthropic();

export const NARRATIVE_MODEL = "claude-opus-4-8";

export function isNarrativeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Coarse failure reasons surfaced to the admin diagnostics UI. */
export type AiErrorReason = "auth" | "rate_limit" | "api";

/**
 * Map an Anthropic SDK error to a coarse reason + human-readable detail.
 * Shared by narrative generation and the admin connection probe so both
 * classify failures the same way.
 */
export function classifyAnthropicError(err: unknown): { reason: AiErrorReason; detail: string } {
  if (err instanceof Anthropic.APIError && typeof err.status === "number") {
    if (err.status === 401 || err.status === 403) {
      return { reason: "auth", detail: `${err.status} — API key rejected` };
    }
    if (err.status === 429) {
      return { reason: "rate_limit", detail: "429 — rate limited" };
    }
    return { reason: "api", detail: `${err.status} — ${err.message}` };
  }
  return { reason: "api", detail: err instanceof Error ? err.message : "Unknown error" };
}
