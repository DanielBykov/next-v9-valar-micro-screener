export const GAUGE_DATA = [
  { name: 'Risk-Off', value: 55, fill: '#EF4444' },
  { name: 'Fragile', value: 15, fill: '#F59E0B' },
  { name: 'Neutral', value: 15, fill: '#3B82F6' },
  { name: 'Constructive', value: 15, fill: '#14B8A6' },
  { name: 'Risk-On', value: 20, fill: '#10B981' },
];

export function getBlockSignal(score: number): { label: string; color: string; glowClass: string; borderColor: string } {
  if (score >= 16) return { label: "Strong Positive", color: "#10B981", glowClass: "glow-emerald", borderColor: "border-emerald-500/30" };
  if (score >= 12) return { label: "Neutral / Balanced", color: "#3B82F6", glowClass: "glow-blue", borderColor: "border-blue-500/30" };
  if (score >= 8) return { label: "Fragile", color: "#F59E0B", glowClass: "glow-amber", borderColor: "border-amber-500/30" };
  return { label: "Risk-Off", color: "#EF4444", glowClass: "glow-red", borderColor: "border-red-500/30" };
}

export function getMetricDot(score: number): string {
  if (score >= 4) return "bg-emerald-500";
  if (score === 3) return "bg-blue-400";
  if (score === 2) return "bg-amber-500";
  return "bg-red-500";
}

export function getRegimeForScore(score: number): string {
  if (score >= 100) return "Strong Risk-On";
  if (score >= 85) return "Constructive Risk-On";
  if (score >= 70) return "Neutral / Balanced";
  if (score >= 55) return "Fragile & Volatile";
  return "Risk-Off";
}

export function toNYDateString(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function formatSnapshotDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00-05:00');
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "America/New_York" });
}

export function getScoreColor(score: number): string {
  if (score >= 100) return "#10B981";
  if (score >= 85) return "#14B8A6";
  if (score >= 70) return "#3B82F6";
  if (score >= 55) return "#F59E0B";
  return "#EF4444";
}

export function formatRawValue(
  rawValue: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (rawValue == null) return "—";
  if (unit === "%" || unit === "% YoY") return `${rawValue.toFixed(2)}${unit === "%" ? "%" : "% YoY"}`;
  if (unit === "bps") return `${Math.round(rawValue)} bps`;
  if (unit) return `${rawValue.toFixed(2)} ${unit}`;
  return rawValue.toFixed(2);
}
