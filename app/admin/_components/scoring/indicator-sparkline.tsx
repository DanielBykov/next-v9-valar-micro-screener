"use client";

import { useEffect, useState } from "react";
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

export function IndicatorSparkline({ indicatorKey, days = DEFAULT_DAYS }: Props) {
  const [data, setData] = useState<ApiTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/engine/trend?indicator=${encodeURIComponent(indicatorKey)}&days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Trend request failed (${r.status})`);
        return r.json();
      })
      .then((json: ApiTrend) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [indicatorKey, days]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading trend…
      </div>
    );
  }
  if (error) {
    return <p className="text-[11px] text-red-400 font-mono">{error}</p>;
  }
  if (!data || data.points.length === 0) {
    return <p className="text-[11px] text-[#64748B] italic">No trend data.</p>;
  }

  const points = data.points;
  const xs = points.map((_, i) => PAD + (i / Math.max(1, points.length - 1)) * (WIDTH - 2 * PAD));
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
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-[#64748B]">
          Score history · {data.days}d
        </div>
        <div className="text-[10px] font-mono text-[#94A3B8]">
          {data.from} → {data.to}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-14 block bg-[#0F172A] border border-[#334155] rounded-md"
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
      <div className="text-[10px] font-mono text-[#64748B]">
        latest {last.date} · score {last.score ?? "—"} ({last.bandLabel ?? "—"})
      </div>
    </div>
  );
}
