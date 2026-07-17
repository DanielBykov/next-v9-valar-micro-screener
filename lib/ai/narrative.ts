import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// Anthropic's zod helper targets Zod v4; import the v4 subpath (shipped by
// zod 3.25+) so the schema types line up with zodOutputFormat.
import { z } from "zod/v4";
import type { SnapshotResult } from "@/lib/scoring/types";
import {
  anthropic,
  NARRATIVE_MODEL,
  isNarrativeConfigured,
  classifyAnthropicError,
  type AiErrorReason,
} from "@/lib/ai/client";
import { NARRATIVE_SYSTEM, serializeSnapshot, inputHash } from "@/lib/ai/narrative-prompt";
import { getCachedNarrative, putNarrative } from "@/lib/ai/narrative-repo";

const NarrativeSchema = z.object({
  headline: z
    .string()
    .describe("One line, <=90 chars, naming the regime and its prime driver. No trailing period."),
  narrative: z
    .string()
    .describe("2-3 short paragraphs of markdown. No preamble, headings, or bullet lists."),
});

export type RegimeNarrative = {
  headline: string;
  narrative: string;
  model: string;
  generatedAt: string;
};

/**
 * Result of a narrative request. `ok` carries the note (from cache or a fresh
 * generation); `disabled` means no API key; `error` carries a classified reason
 * so the admin diagnostics UI can explain why AI didn't run. Callers that only
 * want the note (dashboard) treat anything non-`ok` as "render nothing".
 */
export type NarrativeOutcome =
  | { status: "ok"; narrative: RegimeNarrative; fromCache: boolean }
  | { status: "disabled"; reason: "no_api_key" }
  | { status: "error"; reason: AiErrorReason | "empty"; detail: string };

/**
 * Return the AI regime narrative for a snapshot, generating + caching on miss.
 *
 * Never throws on an API failure — returns a classified outcome instead, so the
 * dashboard degrades gracefully and admin tooling can report the reason. Cache
 * is keyed on the score configuration, so identical scores never spend a second
 * API call.
 */
export async function getRegimeNarrative(
  snapshot: SnapshotResult,
  opts: { force?: boolean } = {},
): Promise<NarrativeOutcome> {
  const hash = inputHash(snapshot);

  // force skips the cache read and overwrites the stored note for (date, hash).
  if (!opts.force) {
    const cached = await getCachedNarrative(snapshot.asOfDate, hash);
    if (cached) {
      return {
        status: "ok",
        fromCache: true,
        narrative: {
          headline: cached.headline,
          narrative: cached.narrative,
          model: cached.model,
          generatedAt: cached.generatedAt.toISOString(),
        },
      };
    }
  }

  if (!isNarrativeConfigured()) return { status: "disabled", reason: "no_api_key" };

  try {
    const res = await anthropic.messages.parse({
      model: NARRATIVE_MODEL,
      max_tokens: 3000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: NARRATIVE_SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: serializeSnapshot(snapshot) }],
      output_config: { format: zodOutputFormat(NarrativeSchema) },
    });

    const parsed = res.parsed_output;
    if (!parsed) return { status: "error", reason: "empty", detail: "Model returned no parsed output" };

    await putNarrative(
      {
        snapshotDate: snapshot.asOfDate,
        inputHash: hash,
        headline: parsed.headline,
        narrative: parsed.narrative,
        model: NARRATIVE_MODEL,
      },
      { overwrite: opts.force },
    );

    return {
      status: "ok",
      fromCache: false,
      narrative: { ...parsed, model: NARRATIVE_MODEL, generatedAt: new Date().toISOString() },
    };
  } catch (err) {
    const { reason, detail } = classifyAnthropicError(err);
    console.error("Regime narrative generation failed:", reason, detail);
    return { status: "error", reason, detail };
  }
}
