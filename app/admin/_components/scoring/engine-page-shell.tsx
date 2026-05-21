"use client";

import { useMemo, useState } from "react";
import { BlockSidebar } from "./block-sidebar";
import { BlockSummary } from "./block-summary";
import { IndicatorCard } from "./indicator-card";
import type {
  ApiBlock,
  ApiScoringResult,
  ApiSnapshotResult,
  EngineMetadata,
} from "./types";

type Props = {
  metadata: EngineMetadata;
  live: ApiSnapshotResult | null;
  liveError: string | null;
};

export function EnginePageShell({ metadata, live, liveError }: Props) {
  const firstBlock = metadata.blocks[0]?.key ?? null;
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(firstBlock);

  const selectedBlock: ApiBlock | null = useMemo(
    () => metadata.blocks.find((b) => b.key === selectedBlockKey) ?? null,
    [metadata.blocks, selectedBlockKey],
  );

  const liveBlock = useMemo(
    () => (live ? live.blocks.find((b) => b.blockKey === selectedBlockKey) ?? null : null),
    [live, selectedBlockKey],
  );

  const liveByIndicator = useMemo(() => {
    const map = new Map<string, ApiScoringResult>();
    if (liveBlock) {
      for (const r of liveBlock.indicators) {
        map.set(r.indicatorKey, r);
      }
    }
    return map;
  }, [liveBlock]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-wide">Scoring Engine</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Live, code-driven documentation of every block and indicator. Same classes
          power the dashboard at <code className="font-mono text-[#cbd5e1]">/api/dashboard?mode=engine</code>.
        </p>
        {live && (
          <p className="text-[11px] text-[#64748B] font-mono mt-2">
            As of {live.asOfDate} · total {live.totalScore}/120 · {live.regime}
          </p>
        )}
        {liveError && (
          <p className="text-[11px] text-red-400 font-mono mt-2">Live: {liveError}</p>
        )}
      </header>

      <div className="flex gap-6">
        <BlockSidebar
          blocks={metadata.blocks}
          selectedBlockKey={selectedBlockKey}
          onSelectBlock={setSelectedBlockKey}
          liveBlocks={live?.blocks ?? []}
        />

        <div className="flex-1 min-w-0 space-y-6">
          {selectedBlock ? (
            <>
              <BlockSummary block={selectedBlock} liveBlock={liveBlock} />
              <div className="space-y-6">
                {selectedBlock.scorers.map((scorer) => (
                  <IndicatorCard
                    key={scorer.key}
                    scorer={scorer}
                    liveResult={liveByIndicator.get(scorer.key) ?? null}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#64748B] italic">No blocks registered.</p>
          )}
        </div>
      </div>
    </div>
  );
}
