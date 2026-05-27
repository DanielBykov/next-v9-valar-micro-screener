import { BLOCKS } from "@/lib/scoring/registry";

/**
 * Series declared `source: "manual"` by any scorer in the registry, plus the
 * scorers that consume them. Used by the /admin/manual-inputs page to render
 * one card per series.
 */
export type ManualSeriesEntry = {
  seriesId: string;
  consumers: {
    indicatorKey: string;
    indicatorName: string;
    blockKey: string;
    blockName: string;
  }[];
};

export function getManualSeriesCatalog(): ManualSeriesEntry[] {
  const map = new Map<string, ManualSeriesEntry>();
  for (const block of BLOCKS) {
    for (const scorer of block.scorers) {
      for (const spec of scorer.inputs) {
        if (spec.source !== "manual") continue;
        let entry = map.get(spec.seriesId);
        if (!entry) {
          entry = { seriesId: spec.seriesId, consumers: [] };
          map.set(spec.seriesId, entry);
        }
        entry.consumers.push({
          indicatorKey: scorer.key,
          indicatorName: scorer.name,
          blockKey: block.key,
          blockName: block.name,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.seriesId.localeCompare(b.seriesId));
}
