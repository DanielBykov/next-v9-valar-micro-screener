# VALAR Macro Screener — Macro Pulse Intelligence System

## Overview
A macroeconomic intelligence dashboard that computes and displays a Macro Pulse Score (0–120) across 6 macro domains with 36 metrics. A live scoring engine derives scores from FRED-sourced indicator observations and analyst manual inputs, classifies the macro regime, and renders results in a dark tech institutional terminal UI. Includes an admin suite for data fetching, manual data entry, and engine debugging.

## Architecture
- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, Tailwind CSS v4, Recharts, Radix UI, framer-motion
- **State/Data**: TanStack React Query, Zod validation, react-hook-form
- **Database**: PostgreSQL with Drizzle ORM
- **API**: Next.js Route Handlers (`app/api/`)
- **Data source**: FRED API (cached) + analyst manual inputs

## Data Model (`shared/schema.ts`)
- `snapshots` — Main snapshot record (date, total score, regime, comparisons, interpretation)
- `blocks` — 6 macro domain blocks linked to a snapshot (score out of 20)
- `metrics` — 36 individual metrics linked to blocks (score out of 5)
- `trendPoints` — Monthly historical trend data linked to a snapshot
- `indicatorObservations` — Cached FRED observations (seriesId, date, value, source); unique per (seriesId, date)
- `indicatorManualInputs` — Analyst-entered indicator values with notes; unique per (seriesId, date)

## Scoring Engine (`lib/scoring/`)
- `registry.ts` — `BLOCKS` registry plus `getBlockByKey` / `getScorerByKey` lookups
- `snapshot-engine.ts` — Main engine (`computeRange`, `computeRangeShared`) for live scoring
- `block-engine.ts` — Block-level scorer (`scoreBlockRange`)
- `indicator-scorer.ts` — Individual indicator scoring logic (bands → 1–5 score)
- `dashboard-adapter.ts` — `toDashboardData()` transforms engine output into UI-ready format
- `trend-builder.ts` — `buildDailyTrend` / `buildMonthlyTrend` for historical series
- `observations-repo.ts` — Loads observations from DB for a block + date range
- `manual-inputs-catalog.ts` / `manual-inputs-repo.ts` — Manual input catalog + CRUD
- `helpers.ts` — Date/time utilities
- `types.ts` — Engine types (`Score`, `BlockResult`, `SnapshotResult`, etc.)
- `blocks/` — 6 domain blocks, each defining its indicators, scoring bands, lookback windows, and formulas:
  1. `rates/` — rates & monetary policy
  2. `inflation-labor/` — inflation & labor
  3. `sentiment-risk/` — sentiment & risk
  4. `commodities-global/` — commodities & global
  5. `business-cycle/` — business cycle
  6. `political-narrative/` — political & narrative

## Key Files
- `shared/schema.ts` — Drizzle schema definitions and types
- `lib/db.ts` — PostgreSQL connection pool
- `lib/storage.ts` — `DatabaseStorage` implementing `IStorage` (CRUD for snapshots/blocks/metrics/trends)
- `lib/auth.ts` — Session token create/verify (HMAC-SHA256, 7-day TTL) + `requireAuth`
- `lib/seed.ts` — Seeds the mock snapshot (idempotent)
- `lib/utils.ts` — `cn()` className utility
- `lib/fred/fetcher.ts` — FRED API client (fetch + cache observations)
- `lib/fred/series-catalog.ts` — Catalog of FRED series used by scorers
- `lib/scripts/` — Block-specific seed scripts (manual inputs, gold, VVIX)
- `app/page.tsx` — Dashboard page entry
- `app/components/dashboard/` — Dashboard UI (see below)
- `app/admin/` — Admin interface (engine, data-fetch, indicators, manual-inputs, database)
- `app/login/` — Admin login page
- `app/layout.tsx` — Root layout with metadata and font loading
- `app/globals.css` — Dark tech terminal theme CSS variables with glow utilities
- `app/components/ui/` — Radix/Shadcn-style UI components
- `next.config.mjs`, `postcss.config.mjs`, `drizzle.config.ts`, `components.json` — config

## Dashboard Components (`app/components/dashboard/`)
- `index.tsx` — Dashboard orchestrator
- `Header.tsx` — Title / branding
- `ScoreGauge.tsx` — Semi-circle gauge with regime color bands and animated needle
- `SnapshotStats.tsx` — KPI rows (vs yesterday, 3m avg, 1y avg, interpretation)
- `DomainBlockCard.tsx` — 2x3 grid block cards with per-metric progress bars
- `MetricsTable.tsx` — Collapsible 36-metric intelligence table
- `TrendChart.tsx` — 12-month trend line with regime zone shading
- `ScoreCalendar.tsx` — Calendar date picker for snapshot selection
- `Skeletons.tsx` — Loading placeholders

## API Endpoints
**Public**
- `GET /api/dashboard?date=YYYY-MM-DD` — Snapshot, blocks with metrics, comparisons, historical stats
- `GET /api/snapshots` — Calendar of available snapshot dates with total scores (live, 90-day window)
- `GET /api/trend?date=&granularity=monthly|daily&months=&days=` — Historical trend series (live)
- `GET /api/mock-dashboard?snapshotId=&date=` — **FROZEN** demo endpoint (seeded data)

**Auth**
- `POST /api/auth/login` — Create admin session token
- `POST /api/auth/logout` — Clear admin session

**Admin (auth required)**
- `GET /api/admin/indicators?series=` — List indicator observations
- `GET /api/admin/indicators/coverage` — Observations grouped by series and month
- `GET /api/admin/indicators/freshness` — Latest observation date per series
- `GET /api/admin/fred?series=&start=&end=` — Proxy to FRED API
- `GET /api/admin/fetch-indicators` — Fetch fresh FRED data and cache it
- `POST|GET|DELETE /api/admin/manual-inputs` — Upsert / list / delete analyst inputs
- `POST /api/admin/clear` — Clear all dashboard data
- `GET /api/admin/engine/live?date=` — Run engine and return raw result (blocks, indicators, traces, formulas)
- `GET /api/admin/engine/metadata` — Full scoring registry metadata (no DB access)
- `GET /api/admin/engine/trend?indicator=&days=&date=` — Score trend for a single indicator

## Design
- Dark tech terminal theme (#0F172A background, #111827 panels, #1E293B cards)
- Semi-circle gauge dial with regime color bands and animated needle
- Structured summary panel with KPI rows (not cards)
- 6 domain block cards (2x3 grid) with mini progress bars, signal badges, and colored border glow
- 12-month trend line chart with regime zone shading and custom tooltip
- Collapsible 36-metric intelligence panel table
- Accent colors: emerald (risk-on), teal (constructive), blue (neutral), amber (fragile), red (risk-off)
- Fonts: Inter (body) + JetBrains Mono (data/mono), loaded via next/font/google

## Scripts (`package.json`)
- `dev` — `next dev`
- `build` — `next build`
- `start` — `next start`
- `check` — `tsc` type check
- `db:push` — `drizzle-kit push` (sync schema to DB)
- `sync:onedrive` — sync local docs to OneDrive

## Environment
- `DATABASE_URL` — PostgreSQL connection string
- `FRED_API_KEY` — FRED API key for indicator fetching
- `ADMIN_SESSION_SECRET` — secret for signing admin session tokens
- `reactStrictMode: false` in `next.config.mjs`
- `serverExternalPackages: ["pg"]` keeps the `pg` driver out of the bundle
- `app/global-error.tsx` — catches unrecoverable errors with consistent dark-theme styling

## Frozen Routes
- `/mock-dashboard` and `/api/mock-dashboard` are frozen — no modifications allowed.
