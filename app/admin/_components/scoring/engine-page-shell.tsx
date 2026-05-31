"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { BlockSidebar } from "./block-sidebar";
import { BlockSummary } from "./block-summary";
import { IndicatorCard } from "./indicator-card";
import { EngineDatePicker } from "./engine-date-picker";
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

export function EnginePageShell({ metadata, live: initialLive, liveError: initialLiveError }: Props) {
  const firstBlock = metadata.blocks[0]?.key ?? null;
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(firstBlock);

  // Date state: defaults to whatever the server snapshot reports (today).
  // Falls back to today's ISO if server failed to produce a snapshot.
  const initialIso = initialLive?.asOfDate ?? new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(initialIso);
  const [live, setLive] = useState<ApiSnapshotResult | null>(initialLive);
  const [liveError, setLiveError] = useState<string | null>(initialLiveError);
  const [isLoading, setIsLoading] = useState(false);

  // Refetch whenever selectedDate changes (skip the initial render — server already
  // provided that snapshot).
  useEffect(() => {
    if (selectedDate === initialIso) return;
    let cancelled = false;
    setIsLoading(true);
    setLiveError(null);
    fetch(`/api/admin/engine/live?date=${encodeURIComponent(selectedDate)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.message ?? `Request failed (${r.status})`);
        }
        return r.json() as Promise<ApiSnapshotResult>;
      })
      .then((data) => {
        if (cancelled) return;
        setLive(data);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLive(null);
        setLiveError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, initialIso]);

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
        <p className="text-xs text-text-secondary mt-1">
          Live, code-driven documentation of every block and indicator. Same classes
          power the dashboard at <code className="font-mono text-text-faint">/api/dashboard?mode=engine</code>.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-text-muted font-mono">As of</span>
          <EngineDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            disabled={isLoading}
          />
          {live && !isLoading && (
            <span className="text-[11px] text-text-muted font-mono">
              · total {live.totalScore}/120 · {live.regime}
            </span>
          )}
          {isLoading && (
            <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-mono">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </span>
          )}
        </div>
        {liveError && (
          <p className="text-[11px] text-red-400 font-mono mt-2">Live: {liveError}</p>
        )}
      </header>

      <BlockSidebar
        blocks={metadata.blocks}
        selectedBlockKey={selectedBlockKey}
        onSelectBlock={setSelectedBlockKey}
        liveBlocks={live?.blocks ?? []}
      />

      {selectedBlock ? (
        <>
          <BlockSummary block={selectedBlock} liveBlock={liveBlock} />
          <div className="space-y-6">
            {selectedBlock.scorers.map((scorer) => (
              <IndicatorCard
                key={scorer.key}
                scorer={scorer}
                liveResult={liveByIndicator.get(scorer.key) ?? null}
                asOfDate={selectedDate}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-text-muted italic">No blocks registered.</p>
      )}
    </div>
  );
}
