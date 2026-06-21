"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea,
} from "recharts";
import { getRegimeForScore, toNYDateString } from "./utils";

type Granularity = "monthly" | "daily";

type TrendPoint = {
  /** X-axis tick label. Monthly: "Feb 2025". Daily: day-of-month, e.g. "5". */
  label: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  score: number;
  sortOrder: number;
};

const RANGE_OPTIONS: { key: Granularity; label: string }[] = [
  { key: "daily", label: "1M" },
  { key: "monthly", label: "12M" },
];

function CustomTrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  const score = point.score;
  const regime = getRegimeForScore(score);
  return (
    <div className="bg-surface-overlay border border-border-subtle rounded-lg px-4 py-3 shadow-xl">
      <p className="text-xs text-text-secondary mb-1 font-mono">{point.date}</p>
      <p className="text-lg font-semibold text-text-primary font-mono">{score}</p>
      <p className="text-xs text-text-secondary mt-1">{regime}</p>
    </div>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (g: Granularity) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-base/60 p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md transition-colors ${
            value === opt.key
              ? "bg-surface-overlay text-text-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ChartShell({
  granularity,
  onChange,
  children,
  dashed,
  rangeLabel,
}: {
  granularity: Granularity;
  onChange: (g: Granularity) => void;
  children: React.ReactNode;
  dashed?: boolean;
  rangeLabel?: string;
}) {
  const title =
    granularity === "daily"
      ? "Macro Pulse Trend — Last 30 Days"
      : "Macro Pulse Trend — 12 Months";
  return (
    <div
      className={`bg-surface-raised border rounded-xl overflow-hidden ${
        dashed ? "border-dashed border-border-subtle opacity-70" : "border-border-subtle"
      }`}
    >
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between gap-3">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${dashed ? "text-text-secondary" : "text-text-primary"}`}>
          {title}
        </h3>
        <div className="flex items-center gap-3">
          {rangeLabel && <span className="text-[10px] font-mono text-text-secondary">{rangeLabel}</span>}
          <RangeToggle value={granularity} onChange={onChange} />
        </div>
      </div>
      {children}
    </div>
  );
}

/** Y-axis domain padded around the data, clamped to the 0–120 score scale. */
function yDomain(trend: TrendPoint[]): [number, number] {
  const scores = trend.map((p) => p.score);
  const min = Math.max(0, Math.floor(Math.min(...scores) / 5) * 5 - 5);
  const max = Math.min(120, Math.ceil(Math.max(...scores) / 5) * 5 + 5);
  return [min, max];
}

export function TrendChart({ date }: { date?: Date }) {
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const params = new URLSearchParams({ granularity });
    if (date) params.set("date", toNYDateString(date));
    fetch(`/api/trend?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load trend");
        return res.json();
      })
      .then((d: { trend: TrendPoint[] }) => {
        if (!cancelled) setTrend(d.trend ?? []);
      })
      .catch(() => {
        if (!cancelled) setTrend([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, granularity]);

  if (isLoading) {
    return (
      <ChartShell granularity={granularity} onChange={setGranularity} dashed>
        <div className="p-6 h-[320px] flex items-center justify-center">
          <p className="text-xs text-text-secondary italic">Computing historical scoring…</p>
        </div>
      </ChartShell>
    );
  }

  if (!trend || trend.length === 0) {
    return (
      <ChartShell granularity={granularity} onChange={setGranularity} dashed>
        <div className="p-6 h-[320px] flex items-center justify-center">
          <p className="text-xs text-text-secondary italic">No historical scoring data available yet.</p>
        </div>
      </ChartShell>
    );
  }

  const rangeLabel = `${trend[0].date} — ${trend[trend.length - 1].date}`;

  return (
    <ChartShell granularity={granularity} onChange={setGranularity} rangeLabel={rangeLabel}>
      <div className="p-6">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

              <ReferenceArea y1={55} y2={69} fill="#F59E0B" fillOpacity={0.03} />
              <ReferenceArea y1={70} y2={84} fill="#3B82F6" fillOpacity={0.04} />
              <ReferenceArea y1={85} y2={99} fill="#14B8A6" fillOpacity={0.03} />
              <ReferenceArea y1={100} y2={120} fill="#10B981" fillOpacity={0.03} />

              <XAxis
                dataKey="label"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
                fontFamily="JetBrains Mono"
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                domain={yDomain(trend)}
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                fontFamily="JetBrains Mono"
              />
              <RechartsTooltip content={<CustomTrendTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={granularity === "daily" ? false : { r: 3, fill: '#0F172A', strokeWidth: 2, stroke: '#3B82F6' }}
                activeDot={{ r: 5, fill: '#3B82F6', stroke: '#0F172A', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartShell>
  );
}
