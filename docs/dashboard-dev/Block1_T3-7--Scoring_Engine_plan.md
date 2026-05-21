# Scoring Engine — Design & Implementation Plan (Tasks 3–7)

Covers Tasks 3–7 from `Block1_Research--rates_cb_policy.md`: the scoring logic for Fed Funds Rate Level, Yield Curve, QE/QT Policy, Real Interest Rate, and Last Rate Change Direction.

Designed to scale to all 6 blocks. On-demand (no persisted scores). Self-describing scorer classes so the same code drives both the runtime engine and the admin documentation page.

---

## 1. Architectural Decisions

### 1.1 On-demand computation (no persisted scores)

The engine reads `indicator_observations` and computes scores at request time. Nothing scoring-related is written back to the DB.

**Why**
- Formula edits in admin (future feature) take effect instantly and retroactively across all historical dates.
- One source of truth: the scorer class IS the score. No drift between code and stored values.
- No invalidation/recompute jobs on formula changes.
- Simpler schema: `indicator_observations` is the only persisted truth.

**Trade-offs accepted**
- Per-request compute cost (small at this dataset size — measure before caching).
- No frozen historical record of "what was shown on day X under formula Y" until `scoring_formulas` versioning is added later.
- Trend lines require N-date computation. Use `Promise.all` over the registry; revisit caching only if `/api/dashboard` exceeds ~200ms.

**Deferred**
- `scoring_formulas` (versioned bands) — only when admin formula editor is built.
- `scoring_cache` — only if perf demands it.

### 1.2 Class-based, declarative scorers

Each indicator is a class extending `IndicatorScorer`. The class carries 4 concerns kept in lockstep: `compute()`, `bands[]`, `formula` text, and `examples[]`. The admin page reads this metadata directly — no per-indicator UI code.

### 1.3 Coexistence with mock dashboard

The existing `snapshots/blocks/metrics/trendPoints` tables and seed data remain functional during engine development. A `mode` URL param on `/api/dashboard` switches data source. One dashboard component renders both, since the engine adapter outputs the existing UI shape.

- No table renames.
- No duplicate dashboard component (extract shared components later only if engine-specific UI lands).
- Comment in `shared/schema.ts`: `// MOCK — remove when engine covers all 6 blocks`.

### 1.4 Score scale mapping

- Engine outputs per-indicator score: `1–5` (matches current `metrics.maxScore = 5`).
- Block score: `avg(indicator scores) × 4` → `0–20` (matches current `blocks.maxScore = 20`).
- Total score: `sum(block scores)` → `0–120` (matches current `snapshots.totalScore`).

This preserves backwards compatibility with the existing UI and regime mappings.

---

## 2. File Layout

```
lib/scoring/
├── types.ts                        # Score, ScoreBand, ScoringResult, BlockResult, SnapshotResult
├── indicator-scorer.ts             # Abstract base class
├── block-engine.ts                 # Scores a single block
├── snapshot-engine.ts              # Orchestrates all blocks
├── observations-repo.ts            # Pure read layer over indicator_observations
├── helpers.ts                      # clamp, latest, deltaOverDays, etc.
├── dashboard-adapter.ts            # SnapshotResult → existing dashboard UI shape
├── registry.ts                     # BLOCKS[] — single source of truth
└── blocks/
    └── rates/
        ├── index.ts                # BlockDefinition (name, regimeFor, scorers[])
        ├── fed-funds-rate.ts       # Task 3
        ├── yield-curve.ts          # Task 4
        ├── qe-qt-policy.ts         # Task 5
        ├── real-interest-rate.ts   # Task 6
        └── last-rate-change.ts     # Task 7
```

Future blocks: add `blocks/inflation/`, `blocks/sentiment/`, etc., register in `registry.ts`. Zero core changes.

---

## 3. Core Engine Contracts

### 3.1 Types

```ts
// lib/scoring/types.ts
export type Score = 1 | 2 | 3 | 4 | 5;

export type SeriesInputSpec = {
  seriesId: string;          // "DFF", "WALCL"
  lookbackDays: number;
  required: boolean;
};

export type ScoreBand = {
  score: Score;
  label: string;             // "Very Bearish"
  rangeLabel: string;        // ">5.25%"
  test: (v: number) => boolean;
  interpretation: string;
};

export type IndicatorExample = {
  description: string;       // "Mid-2023 peak rates"
  inputs: Record<string, number>;
  expectedScore: Score;
};

export type ScoringInput = {
  asOfDate: Date;
  observations: Record<string, IndicatorObservation[]>; // by series_id, sorted desc
};

export type ScoringResult = {
  indicatorKey: string;
  score: Score;
  rawValue: number | null;
  bandLabel: string;
  interpretation: string;
  inputsUsed: Array<{ seriesId: string; date: string; value: number }>;
  formulaTrace: string;      // "DGS10 (4.21) − T10YIE (2.32) = 1.89"
  warning?: string;
};

export type BlockResult = {
  blockKey: string;
  blockName: string;
  asOfDate: string;
  indicators: ScoringResult[];
  blockAverage: number;      // 1.0–5.0
  blockScore: number;        // avg × 4, 0–20
  regimeLabel: string;
};

export type SnapshotResult = {
  asOfDate: string;
  blocks: BlockResult[];
  totalScore: number;        // 0–120
  regime: string;
  computedAt: string;
};
```

### 3.2 Abstract base class

```ts
// lib/scoring/indicator-scorer.ts
export abstract class IndicatorScorer {
  abstract readonly key: string;             // "fed_funds_rate_level"
  abstract readonly name: string;            // "Fed Funds Rate Level"
  abstract readonly blockKey: string;        // "rates"
  abstract readonly unit: string;            // "%", "bps", "$B/mo"
  abstract readonly description: string;
  abstract readonly formula: string;         // "score(DFF_latest)"
  abstract readonly formulaPretty: string;
  abstract readonly inputs: SeriesInputSpec[];
  abstract readonly bands: ScoreBand[];
  abstract readonly examples: IndicatorExample[];

  /** Pure function: observations → score */
  abstract compute(input: ScoringInput): ScoringResult;

  protected latest(input: ScoringInput, seriesId: string) {
    return input.observations[seriesId]?.[0] ?? null;
  }

  protected band(value: number): ScoreBand {
    return this.bands.find(b => b.test(value)) ?? this.bands[2];
  }
}
```

### 3.3 Block & snapshot engines

```ts
// lib/scoring/snapshot-engine.ts
export class SnapshotEngine {
  constructor(private readonly registry: BlockDefinition[]) {}

  async compute(asOfDate: Date): Promise<SnapshotResult> {
    const blocks = await Promise.all(
      this.registry.map(def => new BlockEngine(def).scoreBlock(asOfDate))
    );
    const totalScore = blocks.reduce((s, b) => s + b.blockScore, 0);
    return {
      asOfDate: toIsoDate(asOfDate),
      blocks,
      totalScore,
      regime: regimeForTotalScore(totalScore),
      computedAt: new Date().toISOString(),
    };
  }

  async computeRange(dates: Date[]): Promise<SnapshotResult[]> { /* parallel */ }
}
```

The engine is pure: same observations + same registry → same result. No DB writes, no globals.

---

## 4. Example Scorer

```ts
// lib/scoring/blocks/rates/real-interest-rate.ts
export class RealInterestRateScorer extends IndicatorScorer {
  readonly key = "real_interest_rate";
  readonly name = "Real Interest Rate";
  readonly blockKey = "rates";
  readonly unit = "%";
  readonly description =
    "Real (inflation-adjusted) 10-year yield. The cost of capital after stripping inflation expectations. Deeply positive = restrictive; negative = stimulative.";
  readonly formula = "DGS10 - T10YIE";
  readonly formulaPretty =
    "real_rate = DGS10 (10Y Treasury yield) − T10YIE (10Y breakeven inflation)";
  readonly inputs = [
    { seriesId: "DGS10",  lookbackDays: 5, required: true },
    { seriesId: "T10YIE", lookbackDays: 5, required: true },
  ];
  readonly bands: ScoreBand[] = [
    { score: 1, label: "Very Restrictive", rangeLabel: "> 2.5%",
      test: v => v > 2.5,
      interpretation: "Strong headwind for equities; real cost of capital elevated." },
    { score: 2, label: "Restrictive", rangeLabel: "1.5% – 2.5%",
      test: v => v > 1.5 && v <= 2.5,
      interpretation: "Restrictive territory; real yields pressure valuations." },
    { score: 3, label: "Neutral", rangeLabel: "0.5% – 1.49%",
      test: v => v >= 0.5 && v <= 1.49,
      interpretation: "Moderately positive; near long-run neutral." },
    { score: 4, label: "Accommodative", rangeLabel: "-0.5% – 0.49%",
      test: v => v >= -0.5 && v < 0.5,
      interpretation: "Low/slightly negative; supportive for risk assets." },
    { score: 5, label: "Very Accommodative", rangeLabel: "< -0.5%",
      test: v => v < -0.5,
      interpretation: "Deeply negative; maximum stimulus for equities." },
  ];
  readonly examples = [
    { description: "May 2026 (current)",  inputs: { DGS10: 4.21, T10YIE: 2.32 }, expectedScore: 2 },
    { description: "COVID lows (Aug 2020)", inputs: { DGS10: 0.55, T10YIE: 1.70 }, expectedScore: 5 },
    { description: "2018 peak",            inputs: { DGS10: 3.20, T10YIE: 2.10 }, expectedScore: 3 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const d = this.latest(input, "DGS10");
    const t = this.latest(input, "T10YIE");
    if (!d || !t) {
      return {
        indicatorKey: this.key, score: 3, rawValue: null,
        bandLabel: "Unknown", interpretation: "Missing inputs",
        inputsUsed: [], formulaTrace: "n/a",
        warning: "Missing DGS10 or T10YIE observation",
      };
    }
    const realRate = Number(d.value) - Number(t.value);
    const band = this.band(realRate);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: realRate,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "DGS10",  date: d.observationDate, value: Number(d.value) },
        { seriesId: "T10YIE", date: t.observationDate, value: Number(t.value) },
      ],
      formulaTrace: `DGS10 (${d.value}) − T10YIE (${t.value}) = ${realRate.toFixed(2)}%`,
    };
  }
}
```

The pattern is identical for the other 4 scorers — they differ only in `compute()` body and `bands[]`.

---

## 5. API Surface

| Route | Method | Purpose |
|---|---|---|
| `/api/dashboard?mode=mock\|engine&date=YYYY-MM-DD` | GET | Main dashboard. `mode=mock` reads seed tables; `mode=engine` runs `SnapshotEngine` and merges with mock fallback for unimplemented blocks. |
| `/api/admin/engine/metadata` | GET | Full registry — block defs, scorer metadata, bands, examples, formulas. Static, no DB. |
| `/api/admin/engine/live?date=YYYY-MM-DD` | GET | Raw `SnapshotResult` from the engine (untransformed). |
| `/api/admin/engine/preview` | POST | Run engine with custom band overrides — for Try-it / formula-edit preview. |
| `/api/admin/engine/trend?indicator=KEY&days=400` | GET | Historical scores for one indicator. |
| `/api/admin/fetch-indicators` | POST | Existing FRED bulk fetch (Task 2). |

### `/api/dashboard` flow

```
GET /api/dashboard?mode=engine
  ↓
SnapshotEngine.compute(today)         ← blocks run in parallel
  ↓
mergeBlocks(mockSnapshot, engineSnapshot)  ← engine overrides matching blocks
  ↓
dashboard-adapter: SnapshotResult → { snapshot, blocks, metrics, trend }
  ↓
JSON response (existing UI shape)
```

Cutover: when all 6 blocks have scorers, delete `mergeBlocks` fallback and the mock seed in one commit.

---

## 6. Frontend Switcher

Single toolbar control at top of dashboard, persisted to `localStorage`:

```
Data source:  ● Mock  ○ Engine (rates only)
```

Switch only changes the fetch URL. Same `dashboard.tsx` renders both. See sketch in chat history.

When engine fully covers everything, either flip default to `engine` and retire the switch, or keep it for QA/regression demos.

---

## 7. Admin Engine Page (`/admin/engine`)

Read-only documentation page driven entirely by the registry — zero per-indicator UI code.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  Scoring Engine                                            │
│  ┌────────────┐  ┌─────────────────────────────────────┐   │
│  │ Sidebar    │  │  Block: Rates & CB Policy           │   │
│  │            │  │  Block-average → regime table       │   │
│  │ ▼ Rates    │  │                                     │   │
│  │   • Fed F. │  │  Indicators (5)                     │   │
│  │   • Yield  │  │  [card] [card] [card] [card] [card] │   │
│  │   • QE/QT  │  └─────────────────────────────────────┘   │
│  │   • Real R.│                                            │
│  │   • Last Δ │                                            │
│  │ ▷ Inflation│                                            │
│  └────────────┘                                            │
└────────────────────────────────────────────────────────────┘
```

### Per-indicator card content

1. **Header**: name, current live score badge, band label.
2. **Description**: long-form prose explaining what it measures.
3. **Formula block**: `formulaPretty` rendered in monospace, with live `formulaTrace` showing the actual current values plugged in.
4. **Inputs**: table of FRED series + date + value, with links to FRED.
5. **Scoring bands**: 5-row table with current band highlighted.
6. **Examples**: 2–3 worked historical cases.
7. **Sparkline**: last 12 months of computed scores for this indicator (calls `/api/admin/engine/trend`).
8. **Try-it panel** (client-side): input boxes for each FRED series → runs `scorer.compute()` locally → shows resulting score and trace. Useful for verifying band thresholds without backend round-trip.

### Components

- `<IndicatorCard scorer liveResult />`
- `<ScoringBandsTable bands currentScore />`
- `<FormulaBlock formulaPretty trace />`
- `<TryItPanel scorer />` — pure client
- `<BlockSummary def />` — block average → regime mapping
- `<IndicatorSparkline indicatorKey />`

All driven by registry metadata + `/api/admin/engine/{metadata,live,trend}`.

---

## 8. Schema Impact

**No new tables for the engine itself.** Only `indicator_observations` is needed (already exists from Task 1).

**Comment to add** in `shared/schema.ts`:
```ts
// MOCK — used by seed-driven dashboard. Remove when engine covers all 6 blocks.
export const snapshots = pgTable("snapshots", { ... });
export const blocks    = pgTable("blocks",    { ... });
export const metrics   = pgTable("metrics",   { ... });
export const trendPoints = pgTable("trend_points", { ... });
```

**Future additions** (not part of Tasks 3–7):
- `scoring_formulas` (versioned bands_json) — when admin formula editor lands.
- `scoring_cache` — only if perf demands it.

---

## 9. Implementation Task Sequence

| # | Task | Files | Deps |
|---|---|---|---|
| 0a | Core types + base class + helpers | `lib/scoring/{types,indicator-scorer,helpers}.ts` | — |
| 0b | Observations repo | `lib/scoring/observations-repo.ts` | 0a |
| 0c | Block engine + snapshot engine | `lib/scoring/{block-engine,snapshot-engine}.ts` | 0a, 0b |
| 0d | Registry + rates block index | `lib/scoring/registry.ts`, `blocks/rates/index.ts` | 0a |
| **3** | `FedFundsRateLevelScorer` | `blocks/rates/fed-funds-rate.ts` | 0a |
| **4** | `YieldCurveScorer` | `blocks/rates/yield-curve.ts` | 0a |
| **5** | `QePolicyScorer` (4-week delta) | `blocks/rates/qe-qt-policy.ts` | 0a |
| **6** | `RealInterestRateScorer` | `blocks/rates/real-interest-rate.ts` | 0a |
| **7** | `LastRateChangeScorer` (DFEDTARU diff) | `blocks/rates/last-rate-change.ts` | 0a |
| D1 | Dashboard adapter + wire `/api/dashboard?mode=engine` | `lib/scoring/dashboard-adapter.ts`, `app/api/dashboard/route.ts` | 0a–0d, ≥1 scorer |
| D2 | Frontend mode switcher | `app/components/data-source-switch.tsx`, `app/components/dashboard.tsx` | D1 |
| A1 | `/api/admin/engine/metadata` | `app/api/admin/engine/metadata/route.ts` | 0d |
| A2 | `/api/admin/engine/live` | `app/api/admin/engine/live/route.ts` | 0c |
| A3 | `/api/admin/engine/trend` | `app/api/admin/engine/trend/route.ts` | 0c |
| A4 | Admin `/admin/engine` page + components | `app/admin/engine/page.tsx`, `app/admin/_components/scoring/*` | A1–A3 |
| A5 | Sidebar nav entry | `app/admin/_components/sidebar.tsx` | A4 |

Tasks 3–7 are independent once 0a is done; can be parallelized. D1 needs at least one scorer for end-to-end smoke.

### Recommended order

1. **0a–0d** — engine core + rates block index.
2. **Task 3** (Fed Funds) as vertical slice.
3. **D1 + D2** — wire dashboard and switcher; verify end-to-end with one indicator.
4. **Tasks 4–7** — remaining scorers in parallel.
5. **A1–A5** — admin engine page.

---

## 10. Key Properties

- **Single source of truth**: scorer classes define name, description, formula, bands, examples, and computation in one place. Admin UI reads the same objects.
- **Pure functions**: same observations → same result. Easy to test, no globals.
- **Retroactive formula edits**: changing a band in code affects all historical dates on the next request.
- **Scalable to 6 blocks**: new blocks = new folder + register. No core changes.
- **Coexistence with mock**: mode switcher allows incremental rollout per block.
- **Future formula editor**: `scoring_formulas` table can override class defaults via `bands_json`; classes remain canonical fallback.
