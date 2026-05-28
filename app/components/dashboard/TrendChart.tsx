import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea,
} from "recharts";
import { getRegimeForScore } from "./utils";
import type { DashboardData } from "./types";

function CustomTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const regime = getRegimeForScore(score);
  return (
    <div className="bg-surface-overlay border border-border-subtle rounded-lg px-4 py-3 shadow-xl">
      <p className="text-xs text-text-secondary mb-1 font-mono">{label}</p>
      <p className="text-lg font-semibold text-text-primary font-mono">{score}</p>
      <p className="text-xs text-text-secondary mt-1">{regime}</p>
    </div>
  );
}

export function TrendChart({ trendData }: { trendData: DashboardData["trend"] }) {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="bg-surface-raised border border-dashed border-border-subtle rounded-xl overflow-hidden opacity-70">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Macro Pulse Trend — 12 Months</h3>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-border-default text-text-secondary bg-surface-base/60">
            Planned
          </span>
        </div>
        <div className="p-6 h-[320px] flex items-center justify-center">
          <p className="text-xs text-text-secondary italic">Trend will activate once historical scoring lands.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Macro Pulse Trend — 12 Months</h3>
        <span className="text-[10px] font-mono text-text-secondary">Feb 2025 — Feb 2026</span>
      </div>
      <div className="p-6">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

              <ReferenceArea y1={55} y2={69} fill="#F59E0B" fillOpacity={0.03} />
              <ReferenceArea y1={70} y2={84} fill="#3B82F6" fillOpacity={0.04} />
              <ReferenceArea y1={85} y2={99} fill="#14B8A6" fillOpacity={0.03} />
              <ReferenceArea y1={100} y2={120} fill="#10B981" fillOpacity={0.03} />

              <XAxis
                dataKey="month"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
                fontFamily="JetBrains Mono"
              />
              <YAxis
                domain={[60, 100]}
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
                dot={{ r: 3, fill: '#0F172A', strokeWidth: 2, stroke: '#3B82F6' }}
                activeDot={{ r: 5, fill: '#3B82F6', stroke: '#0F172A', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
