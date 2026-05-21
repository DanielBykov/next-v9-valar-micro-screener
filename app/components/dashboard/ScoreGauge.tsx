import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GAUGE_DATA, formatSnapshotDate } from "./utils";
import type { DashboardData } from "./types";

export function ScoreGauge({ snapshot }: { snapshot: DashboardData["snapshot"] }) {
  const needleRotation = (snapshot.totalScore / 120) * 180 - 90;

  return (
    <div className="lg:col-span-5 bg-[#111827] border border-[#334155] rounded-xl p-8 flex flex-col items-center relative">
      <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-[0.15em] mb-1">Macro Pulse Score</p>

      <div className="relative h-44 w-full flex items-end justify-center mt-2">
        <ResponsiveContainer width="100%" height="200%">
          <PieChart>
            <Pie
              data={GAUGE_DATA}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius="72%"
              outerRadius="100%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {GAUGE_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} opacity={0.7} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div
          className="absolute bottom-0 w-1.5 h-20 bg-[#F8FAFC] origin-bottom rounded-t-full z-10 transition-transform duration-1000 ease-out"
          style={{ transform: `rotate(${needleRotation}deg)`, boxShadow: '0 0 8px rgba(248,250,252,0.3)' }}
        />
        <div className="absolute bottom-[-5px] w-3.5 h-3.5 bg-[#F8FAFC] rounded-full z-20" style={{ boxShadow: '0 0 10px rgba(248,250,252,0.4)' }} />

        <div className="absolute bottom-3 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold tracking-tight text-[#F8FAFC] font-mono" data-testid="text-total-score">{snapshot.totalScore}</span>
            <span className="text-base text-[#94A3B8] font-mono">/120</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2">
        <span className="text-sm font-semibold text-[#3B82F6] px-3 py-1 bg-[#3B82F6]/10 rounded border border-[#3B82F6]/20" data-testid="text-regime">
          {snapshot.regime}
        </span>
        {snapshot.regimeSubtitle && (
          <span className="text-xs text-[#94A3B8] font-mono" data-testid="text-regime-subtitle">{snapshot.regimeSubtitle}</span>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-1">
        <span className="text-lg font-semibold text-[#F8FAFC]" data-testid="text-snapshot-date">{formatSnapshotDate(snapshot.snapshotDate)} (NY)</span>
        <span className="text-[11px] text-[#94A3B8] font-mono uppercase tracking-wider">Daily Snapshot</span>
      </div>
    </div>
  );
}
