"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ApiTrend } from "./types";

const DEFAULT_DAYS = 365;
const WIDTH = 360;
const HEIGHT = 56;
const PAD = 4;

type Props = {
  indicatorKey: string;
  days?: number;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: ApiTrend };

export function IndicatorSparkline({ indicatorKey, days = DEFAULT_DAYS }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const load = () => {
    setState({ kind: "loading" });
    fetch(`/api/admin/engine/trend?indicator=${encodeURIComponent(indicatorKey)}&days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Trend request failed (${r.status})`);
        return r.json();
      })
      .then((data: ApiTrend) => setState({ kind: "loaded", data }))
      .catch((err: Error) => setState({ kind: "error", message: err.message }));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">
          Score history · {days}d
        </div>
        {state.kind === "loaded" && (
          <div className="text-[10px] font-mono text-text-secondary">
            {state.data.from} → {state.data.to}
          </div>
        )}
      </div>

      {state.kind === "idle" && (
        <button
          type="button"
          onClick={load}
          className="bg-surface-overlay hover:bg-border-subtle border border-border-subtle text-text-faint hover:text-text-primary text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
        >
          Load trend
        </button>
      )}

      {state.kind === "loading" && (
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading trend…
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-red-400 font-mono">{state.message}</p>
          <button
            type="button"
            onClick={load}
            className="text-[11px] text-text-secondary hover:text-text-primary underline underline-offset-2"
          >
            retry
          </button>
        </div>
      )}

      {state.kind === "loaded" && <SparklineSvg data={state.data} />}
    </div>
  );
}

function SparklineSvg({ data }: { data: ApiTrend }) {
  const points = data.points;
  if (points.length === 0) {
    return <p className="text-[11px] text-text-muted italic">No trend data.</p>;
  }

  const xs = points.map(
    (_, i) => PAD + (i / Math.max(1, points.length - 1)) * (WIDTH - 2 * PAD),
  );
  const ys = points.map((p) => {
    if (p.score == null) return null;
    // score: 1 (bottom) → 5 (top)
    return HEIGHT - PAD - ((p.score - 1) / 4) * (HEIGHT - 2 * PAD);
  });

  // Build polyline segments skipping null gaps.
  const segments: string[] = [];
  let cur: string[] = [];
  for (let i = 0; i < ys.length; i++) {
    const y = ys[i];
    if (y == null) {
      if (cur.length > 1) segments.push(cur.join(" "));
      cur = [];
    } else {
      cur.push(`${xs[i].toFixed(1)},${y.toFixed(1)}`);
    }
  }
  if (cur.length > 1) segments.push(cur.join(" "));

  const last = points[points.length - 1];

  return (
    <>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-14 block bg-surface-base border border-border-subtle rounded-md"
        preserveAspectRatio="none"
      >
        {[1, 2, 3, 4, 5].map((s) => {
          const y = HEIGHT - PAD - ((s - 1) / 4) * (HEIGHT - 2 * PAD);
          return (
            <line
              key={s}
              x1={PAD}
              x2={WIDTH - PAD}
              y1={y}
              y2={y}
              stroke="#1E293B"
              strokeWidth={s === 3 ? 0.6 : 0.3}
            />
          );
        })}
        {segments.map((seg, i) => (
          <polyline key={i} points={seg} fill="none" stroke="#60A5FA" strokeWidth={1.25} />
        ))}
      </svg>
      <div className="text-[10px] font-mono text-text-muted">
        latest {last.date} · score {last.score ?? "—"} ({last.bandLabel ?? "—"})
      </div>
    </>
  );
}
