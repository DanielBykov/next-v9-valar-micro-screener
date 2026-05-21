import { BLOCKS } from "@/lib/scoring/registry";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import type {
  ApiBlock,
  ApiSnapshotResult,
  EngineMetadata,
} from "@/app/admin/_components/scoring/types";
import { EnginePageShell } from "@/app/admin/_components/scoring/engine-page-shell";

/**
 * /admin/engine — Read-only documentation page for the scoring engine.
 *
 * Server-renders the static registry metadata and the live snapshot for
 * "today" so the initial paint is fully populated with current scores.
 * The client shell handles selection state, sparklines (via /trend) and
 * the try-it panel (client-side scorer.compute).
 */
export default async function EnginePage() {
  const metadata: EngineMetadata = {
    blocks: BLOCKS.slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map<ApiBlock>((block) => ({
        key: block.key,
        name: block.name,
        sortOrder: block.sortOrder,
        regimeMap: block.regimeMap,
        scorers: block.scorers.map((scorer) => ({
          key: scorer.key,
          name: scorer.name,
          blockKey: scorer.blockKey,
          unit: scorer.unit,
          description: scorer.description,
          formula: scorer.formula,
          formulaPretty: scorer.formulaPretty,
          inputs: scorer.inputs,
          bands: scorer.bands.map((b) => ({
            score: b.score,
            label: b.label,
            rangeLabel: b.rangeLabel,
            interpretation: b.interpretation,
          })),
          examples: scorer.examples,
        })),
      })),
  };

  let live: ApiSnapshotResult | null = null;
  let liveError: string | null = null;
  try {
    const engine = new SnapshotEngine(BLOCKS);
    live = (await engine.compute(new Date())) as ApiSnapshotResult;
  } catch (err: any) {
    liveError = err?.message ?? "Failed to compute live snapshot";
  }

  return <EnginePageShell metadata={metadata} live={live} liveError={liveError} />;
}
