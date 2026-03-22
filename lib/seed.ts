import { storage } from "./storage";

// ── helpers ──────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function jitter(base: number, range: number, lo: number, hi: number) {
  return clamp(base + Math.round((Math.random() - 0.5) * 2 * range), lo, hi);
}

// ── 28-day macro narrative arc for Feb 2026 ──────────────────────────
// Scores drift lower mid-month on hawkish Fed + weak data, then partially recover
const dailyScores: number[] = [
  81, 80, 80, 79, 78, 78, 77, 76, 75, 74,   // 1-10: slow grind lower
  73, 72, 71, 70, 70, 71, 72, 73, 74, 75,   // 11-20: bottom & recovery
  76, 77, 78, 78, 79, 80, 80, 81,            // 21-28: mean reversion
];

function regimeFor(score: number): { regime: string; subtitle: string } {
  if (score >= 80) return { regime: "Neutral / Balanced", subtitle: "Leaning Fragile" };
  if (score >= 75) return { regime: "Neutral / Balanced", subtitle: "Weakening" };
  if (score >= 70) return { regime: "Risk-Off", subtitle: "Fragile" };
  return { regime: "Risk-Off", subtitle: "Stressed" };
}

function interpretationFor(score: number, day: number): string {
  if (score >= 80)
    return `Macro Pulse Score of ${score} indicates a neutral macro environment with increasing fragility. Business cycle weakness and monetary tightness remain key headwinds.`;
  if (score >= 75)
    return `Score of ${score} reflects a weakening macro backdrop. Hawkish Fed rhetoric and deteriorating sentiment are pressuring risk appetite, though labor data provides a floor.`;
  if (score >= 72)
    return `At ${score}, the macro environment has shifted to risk-off. Yield curve inversion deepened, ISM contracted further, and volatility is elevated. Defensive positioning warranted.`;
  return `Score of ${score} marks the weakest reading this month. Peak pessimism driven by hawkish FOMC minutes, widening credit spreads, and deteriorating breadth. Watch for contrarian bounce signals.`;
}

// ── block-level score arcs (each out of 20) ──────────────────────────
// Each array has 28 entries corresponding to Feb 1-28
const blockArcs: Record<string, { scores: number[]; summaries: [string, string, string] }> = {
  "Rates & Central Bank Policy": {
    scores: [13,13,12,12,12,11,11,10,10,10, 9, 9, 9, 9,10,10,10,11,11,11, 12,12,12,13,13,13,13,13],
    summaries: [
      "Tight monetary conditions remain restrictive.",
      "Hawkish shift intensifies rate headwinds.",
      "Rate expectations stabilizing as data softens.",
    ],
  },
  "Inflation & Labour Market": {
    scores: [17,17,17,16,16,16,16,16,15,15, 15,15,14,14,14,15,15,15,16,16, 16,16,17,17,17,17,17,17],
    summaries: [
      "Disinflation trend stabilizing as labor supply normalizes.",
      "Labor market showing cracks; NFP miss weighs on outlook.",
      "Labor resilience returning, wage pressure easing further.",
    ],
  },
  "Sentiment & Volatility": {
    scores: [12,12,12,11,11,11,10,10, 9, 9,  9, 8, 8, 8, 8, 9, 9,10,10,11, 11,12,12,12,12,12,12,12],
    summaries: [
      "Elevated baseline volatility with defensive positioning.",
      "Fear dominant — VIX spike and breadth collapse.",
      "Sentiment recovering from oversold extremes.",
    ],
  },
  "Commodities & Global Flow": {
    scores: [15,15,15,15,14,14,14,14,14,13, 13,13,13,13,13,13,14,14,14,14, 15,15,15,15,15,15,15,15],
    summaries: [
      "Safe-haven flows support gold amidst industrial weakness.",
      "Dollar strength and copper weakness signal global slowdown.",
      "Commodity complex stabilizing; gold bid persists.",
    ],
  },
  "Business Cycle & Rotation": {
    scores: [12,12,12,12,12,12,12,11,11,11, 11,11,10,10,10,10,10,11,11,11, 11,11,11,12,12,12,12,12],
    summaries: [
      "Late-cycle indicators show persistent contraction.",
      "ISM contraction deepens; small caps underperform sharply.",
      "Tentative signs of cycle trough forming.",
    ],
  },
  "Narrative & Political Risk": {
    scores: [12,11,12,13,13,14,14,15,16,16, 16,16,17,17,16,14,14,12,12,12, 11,11,11,11,12,13,13,12],
    summaries: [
      "Geopolitical friction acting as structural headwind.",
      "Sanctions escalation and trade rhetoric peak mid-month.",
      "Political risk receding as diplomatic channels reopen.",
    ],
  },
};

const blockNames = Object.keys(blockArcs);

// ── per-block metric templates ───────────────────────────────────────
type MetricTemplate = {
  name: string;
  baseScore: number;
  interps: [string, string, string]; // [high, mid, low]
  driverPhase: "early" | "mid" | "late" | "none";
};

const metricTemplates: Record<string, MetricTemplate[]> = {
  "Rates & Central Bank Policy": [
    { name: "Fed Funds Rate Level",       baseScore: 3, interps: ["Elevated, acting as a headwind to growth.", "Highly restrictive, weighing on activity.", "Still restrictive but markets pricing cuts."], driverPhase: "mid" },
    { name: "Last Rate Change Direction", baseScore: 3, interps: ["Hold/Mild cuts expected, restrictive real rate.", "No cuts — hawkish hold surprises markets.", "Cut expectations rebuilding on soft data."], driverPhase: "none" },
    { name: "Forward Guidance Tone",      baseScore: 2, interps: ["Cautious, data-dependent stance.", "Hawkish pivot — higher-for-longer reiterated.", "Dovish tilt emerging in Fed communications."], driverPhase: "early" },
    { name: "Yield Curve (2Y–10Y)",       baseScore: 1, interps: ["Inversion persists, signaling late-cycle risks.", "Inversion deepens to -50bps, recession signal.", "Inversion moderating as front-end reprices."], driverPhase: "mid" },
    { name: "Balance Sheet (QE/QT)",      baseScore: 2, interps: ["QT ongoing, liquidity drain.", "QT pace unchanged; reserves declining.", "QT taper discussion supporting liquidity."], driverPhase: "none" },
    { name: "Real Interest Rate",         baseScore: 2, interps: ["Positive and restrictive.", "Real rates at cycle highs, deeply restrictive.", "Real rates easing as breakevens drift."], driverPhase: "none" },
  ],
  "Inflation & Labour Market": [
    { name: "CPI YoY",            baseScore: 3, interps: ["Disinflation trend stabilizing.", "CPI uptick raises re-acceleration fears.", "Disinflation resumes after one-off spike."], driverPhase: "none" },
    { name: "Core CPI Trend",     baseScore: 3, interps: ["Sticky services inflation remains.", "Core CPI accelerates on shelter costs.", "Core CPI shows welcome deceleration."], driverPhase: "mid" },
    { name: "Unemployment Rate",  baseScore: 3, interps: ["Trending slightly higher but sub-4.5%.", "Unemployment ticks up to 4.3%, labor cooling.", "Unemployment stabilizes at 4.1%."], driverPhase: "mid" },
    { name: "NFP Surprise",       baseScore: 2, interps: ["Mild downside surprises appearing.", "Significant NFP miss shakes confidence.", "NFP beats estimates, labor holds firm."], driverPhase: "early" },
    { name: "Wage Growth",        baseScore: 3, interps: ["Moderating, relieving corporate margin pressure.", "Wage growth sticky at 4%+, margin risk.", "Wage growth cooling towards 3.5%."], driverPhase: "none" },
    { name: "Participation Rate", baseScore: 3, interps: ["Stable labor supply.", "Participation dips — labor supply concern.", "Participation rate edges higher."], driverPhase: "late" },
  ],
  "Sentiment & Volatility": [
    { name: "VIX",                baseScore: 2, interps: ["Elevated baseline, nervous market.", "VIX spikes above 25, fear rising.", "VIX retreating as selling pressure eases."], driverPhase: "mid" },
    { name: "Put/Call Ratio",     baseScore: 2, interps: ["Defensive positioning increasing.", "Put/call ratio at extremes — heavy hedging.", "Put/call normalizing from elevated levels."], driverPhase: "early" },
    { name: "AAII Spread",        baseScore: 2, interps: ["Retail skepticism prominent.", "Bearish sentiment at 18-month high.", "Bearish extremes suggest contrarian opportunity."], driverPhase: "none" },
    { name: "Fear & Greed Index", baseScore: 2, interps: ["Leaning towards fear.", "Deep fear — index below 25.", "Fear easing as dip-buying emerges."], driverPhase: "mid" },
    { name: "Market Breadth",     baseScore: 2, interps: ["Deteriorating participation.", "Breadth collapses — fewer than 30% above 50dma.", "Breadth improving from washout lows."], driverPhase: "mid" },
    { name: "VVIX",               baseScore: 2, interps: ["Options volatility premium elevated.", "VVIX surges — vol-of-vol signals instability.", "VVIX receding from panic levels."], driverPhase: "none" },
  ],
  "Commodities & Global Flow": [
    { name: "Oil (WTI)",          baseScore: 3, interps: ["Rangebound, demand concerns vs supply risk.", "Oil slides on demand destruction fears.", "Oil stabilizing as OPEC signals restraint."], driverPhase: "none" },
    { name: "Gold",               baseScore: 3, interps: ["Supported by central bank buying and risk-aversion.", "Gold rallies to new highs as haven demand surges.", "Gold holds gains, consolidating near highs."], driverPhase: "mid" },
    { name: "DXY",                baseScore: 2, interps: ["Dollar strength acting as a global tightening force.", "DXY surges past 106, EM stress rising.", "Dollar softening as Fed rhetoric shifts."], driverPhase: "none" },
    { name: "Copper",             baseScore: 2, interps: ["Weakness signaling industrial slowdown.", "Copper breaks support — China demand fears.", "Copper bouncing on stimulus headlines."], driverPhase: "early" },
    { name: "Global PMI",         baseScore: 3, interps: ["Stabilizing at low levels.", "Global PMI slips below 49, contraction zone.", "Global PMI ticking up from trough."], driverPhase: "late" },
    { name: "Treasury Liquidity", baseScore: 2, interps: ["Friction in sovereign debt markets.", "Bid-ask spreads widening in Treasuries.", "Treasury liquidity improving post-auction."], driverPhase: "mid" },
  ],
  "Business Cycle & Rotation": [
    { name: "ISM PMI",             baseScore: 2, interps: ["Contractionary territory.", "ISM drops to 47, deepening contraction.", "ISM stabilizing near 48.5, trough forming."], driverPhase: "mid" },
    { name: "LEI Trend",           baseScore: 2, interps: ["Consistent negative streak.", "LEI extends decline to 23rd consecutive month.", "LEI rate of decline slowing — inflection?"], driverPhase: "early" },
    { name: "Small vs Large Caps", baseScore: 2, interps: ["Large cap dominance continues, narrow leadership.", "Russell 2000 underperforms by 400bps this month.", "Small caps showing relative strength off lows."], driverPhase: "none" },
    { name: "Growth vs Value",     baseScore: 2, interps: ["Choppy rotation amidst rate uncertainty.", "Value outperforms as duration gets punished.", "Growth/value spread normalizing."], driverPhase: "none" },
    { name: "High Yield Spread",   baseScore: 2, interps: ["Widening, credit stress emerging.", "HY spreads blow out +50bps, stress escalating.", "Spreads tightening as risk appetite returns."], driverPhase: "mid" },
    { name: "IPO Activity",        baseScore: 2, interps: ["Subdued primary market.", "IPO window effectively shut.", "Select IPO filings signal returning confidence."], driverPhase: "none" },
  ],
  "Narrative & Political Risk": [
    { name: "China–US Tension Index",    baseScore: 2, interps: ["Persistent structural friction.", "Tensions escalate over tech export controls.", "Diplomatic thaw after high-level talks."], driverPhase: "mid" },
    { name: "Geopolitical Risk Index",   baseScore: 2, interps: ["Elevated regional conflicts.", "Multiple conflict flashpoints active.", "Risk index easing on ceasefire progress."], driverPhase: "none" },
    { name: "Sanctions Activity",        baseScore: 2, interps: ["Increasing fragmentation of trade.", "New sanctions package disrupts supply chains.", "Sanctions impact being absorbed by markets."], driverPhase: "early" },
    { name: "Media Fear Index",          baseScore: 2, interps: ["Recession narrative peaking.", "Media fear at fever pitch — recession calls dominate.", "Recession narrative fading as data stabilizes."], driverPhase: "mid" },
    { name: "Policy Conflict Indicator", baseScore: 2, interps: ["Fiscal vs Monetary dominance clash.", "Policy credibility questioned amid mixed signals.", "Policy signals aligning — less noise."], driverPhase: "early" },
    { name: "Global Easing/Tightening",  baseScore: 2, interps: ["Asynchronous central bank actions.", "Divergent CB paths creating FX volatility.", "Global easing trend broadening ex-Fed."], driverPhase: "none" },
  ],
};

// ── trend data (same 13-month window, anchored to each snapshot's score) ─
function trendFor(currentScore: number) {
  // historical trend always the same, only the final month changes
  return [
    { month: "Feb 2025", score: 92 },
    { month: "Mar",      score: 90 },
    { month: "Apr",      score: 89 },
    { month: "May",      score: 87 },
    { month: "Jun",      score: 85 },
    { month: "Jul",      score: 84 },
    { month: "Aug",      score: 86 },
    { month: "Sep",      score: 83 },
    { month: "Oct",      score: 82 },
    { month: "Nov",      score: 80 },
    { month: "Dec",      score: 78 },
    { month: "Jan 2026", score: 82 },
    { month: "Feb 2026", score: currentScore },
  ];
}

// Determine phase: 0 = early (days 1-9), 1 = mid (10-19), 2 = late (20-28)
function phase(day: number): 0 | 1 | 2 {
  if (day <= 9)  return 0;
  if (day <= 19) return 1;
  return 2;
}

function metricScoreForDay(base: number, blockScore: number, blockMax: number): number {
  const ratio = blockScore / blockMax;
  if (ratio >= 0.75) return clamp(base, 2, 5);
  if (ratio >= 0.55) return clamp(base - 1, 1, 4);
  return clamp(base - 1, 1, 3);
}

function isDriver(tmpl: MetricTemplate, day: number): number {
  if (tmpl.driverPhase === "none") return 0;
  const p = phase(day);
  if (tmpl.driverPhase === "early" && p === 0) return 1;
  if (tmpl.driverPhase === "mid"   && p === 1) return 1;
  if (tmpl.driverPhase === "late"  && p === 2) return 1;
  return 0;
}

// ── main seed function ───────────────────────────────────────────────
export async function seedDatabase() {
  const hasData = await storage.hasData();
  if (hasData) return;

  for (let day = 1; day <= 28; day++) {
    const dd = String(day).padStart(2, "0");
    const dateStr = `2026-02-${dd}`;
    const score = dailyScores[day - 1];
    const prev = day > 1 ? dailyScores[day - 2] : score + 1;
    const { regime, subtitle } = regimeFor(score);

    const snapshot = await storage.createSnapshot({
      snapshotDate: dateStr,
      totalScore: score,
      regime,
      regimeSubtitle: subtitle,
      interpretation: interpretationFor(score, day),
      vsYesterday: score - prev,
      vs3mAvg: score - 85,
      vs1yAvg: score - 92,
      oneYearAgoScore: 92,
    });

    // trend points
    const trend = trendFor(score);
    for (let i = 0; i < trend.length; i++) {
      await storage.createTrendPoint({
        snapshotId: snapshot.id,
        month: trend[i].month,
        score: trend[i].score,
        sortOrder: i,
      });
    }

    // blocks & metrics
    for (let b = 0; b < blockNames.length; b++) {
      const bName = blockNames[b];
      const arc = blockArcs[bName];
      const bScore = arc.scores[day - 1];
      const p = phase(day);
      const summary = arc.summaries[p];

      const block = await storage.createBlock({
        snapshotId: snapshot.id,
        name: bName,
        score: bScore,
        maxScore: 20,
        summary,
        sortOrder: b,
      });

      const templates = metricTemplates[bName];
      for (let m = 0; m < templates.length; m++) {
        const tmpl = templates[m];
        const mScore = metricScoreForDay(tmpl.baseScore, bScore, 20);
        await storage.createMetric({
          blockId: block.id,
          name: tmpl.name,
          domain: bName,
          score: mScore,
          maxScore: 5,
          interpretation: tmpl.interps[p],
          isTopDriver: isDriver(tmpl, day),
          sortOrder: m,
        });
      }
    }
  }

  console.log("Database seeded with 28 daily snapshots (Feb 1-28, 2026).");
}
