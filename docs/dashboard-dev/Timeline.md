# Dev Progress Timeline

## May 5, 2026
- **Connect ClickUp MCP to local dev env**
  Connect ClickUp by MCP to WebStorm (local env) to give Claude more project related context, analyse docs, manage tasks, etc.
  Ticket: [86d2vxdtg](https://app.clickup.com/t/86d2vxdtg) | Status: review

- **Block-1. Discovery**
  Initial discovery and planning for Block-1 scores.
  Ticket: [86d2wf8tv](https://app.clickup.com/t/86d2wf8tv) | Status: review

- **Schema: Add raw indicator observations table**
  Add `indicator_observations` table to store raw indicator data (DFF, T10Y2Y, etc.) separately from scored metrics. Unique constraint on (series_id, observation_date), Drizzle migration, Zod schemas.
  Ticket: [86d2we675](https://app.clickup.com/t/86d2we675) | Priority: high | Status: review

- **FRED Fetcher: Bulk-fetch Rates & CB Policy series**
  Service to bulk-fetch all FRED series (DFF, T10Y2Y, WALCL, DGS10, T10YIE, DFEDTARU) in parallel and upsert into observations table. API route: `POST /api/admin/fetch-indicators?block=rates`.
  Ticket: [86d2we69w](https://app.clickup.com/t/86d2we69w) | Priority: high | Status: review

## May 9, 2026
- **Add authentication for admin routes**
  Protect `/admin` page and `/api/admin/*` endpoints with shared-secret auth. Login page, middleware cookie guard, no external auth deps.
  Ticket: [86d2ze4pb](https://app.clickup.com/t/86d2ze4pb) | Priority: high | Status: review

## May 17, 2026
- **Admin: split into pages with sidebar + new Indicators page**
  Admin area split into separate routes with a left sidebar (Overview, Database, FRED, Indicators). "Database" page renamed to Mock Data. New Indicators page queries `indicator_observations` with date range and series filters, renders results in a table. New API: `GET /api/admin/indicators`.
  Ticket: [86d30xmxy](https://app.clickup.com/t/86d30xmxy) | Status: review

- **Docs: reorganize and add Dashboard Dev documentation**
  Reorganized the documentation structure and added comprehensive Dashboard Dev docs.

- **Auth: add session token utilities**
  Built session token utilities for user authentication.

## May 18, 2026
- **Auth: admin route protection and login improvements**
  Added middleware to protect admin routes so only authenticated users can access `/admin`. Improved login flow — extracted the login form into a Suspense-wrapped component, simplified redirect logic, and fixed date input handling. Updated route type import path.

## May 19, 2026
- **Admin: Data Coverage table and FRED data fetching**
  Added a Data Coverage table showing observation counts by series and month, with collapsible rows. Enhanced FRED API section so the admin can fetch and store indicator data, with auto-refresh after fetching. Cleaned up by removing unused `CoverageTable` component and relocating its logic. Removed unused `middleware.ts` file.

## May 20, 2026
- **Admin: dashboard cards, month filtering, and auth UI**
  Added summary cards to the admin page (data coverage stats, fetch status, latest snapshot). Introduced month filtering for data views. Added login dialog and auth buttons directly on admin pages. Added FRED data management documentation. Added app icon (`icon.svg` with styled "M" logo).

## May 21, 2026
- **Docs: Scoring Engine design and implementation plan**
  Wrote comprehensive design document (`Block1_T3-7--Scoring_Engine_plan.md`) covering the architecture, type system, computation flow, registry structure, API surface, and admin page layout for the Scoring Engine. Covers Tasks 3–7 and defines the roadmap for scalable block-based scoring.

- **Scoring Engine: core framework and block registry**
  Built the Scoring Engine core from scratch — `SnapshotEngine` (top-level orchestrator, sums block scores into a 0–120 total and resolves a regime), `BlockEngine` (runs every scorer in a block, averages indicator scores, resolves block-level regime), `IndicatorScorer` abstract base class (declares identity, documentation, inputs, 1–5 bands, and a pure `compute()`), and `observations-repo` (loads observation data from DB grouped by series). Defined the full type system (`Score`, `ScoreBand`, `ScoringResult`, `BlockResult`, `SnapshotResult`, `BlockDefinition`, etc.) and registered the initial Rates & Central Bank Policy block in the registry.

- **Scoring Engine: five indicator scorers for Rates & CB Policy block**
  Implemented all five auto-scored indicators: `FedFundsRateLevelScorer` (current fed funds rate level), `YieldCurveScorer` (2Y/10Y spread inversion detection), `QePolicyScorer` (QE vs QT via Fed balance sheet changes), `RealInterestRateScorer` (nominal rate minus breakeven inflation), and `LastRateChangeScorer` (direction and magnitude of the most recent rate move). Each scorer includes full documentation, scoring bands, formula traces, and example test cases. Integrated into the Rates block definition with a five-tier regime map (Very Restrictive → Very Accommodative).

## May 22, 2026
- **API: engine metadata, live computation, and trend endpoints**
  Three new admin API routes: `GET /api/admin/engine/metadata` (serves the full scoring registry — block definitions, scorer docs, bands, examples — pure metadata, no DB), `GET /api/admin/engine/live?date=YYYY-MM-DD` (runs `SnapshotEngine` for a given date and returns the raw untransformed result with every block, indicator, inputsUsed, and formulaTrace), and `GET /api/admin/engine/trend?indicator=KEY&days=N` (historical score series for a single indicator — one point per day, batch-loaded observations in a single DB query, linear cost).

- **Admin: Scoring Engine documentation and visualization page**
  New `/admin/engine` page — server-renders registry metadata and a live snapshot for today. Client shell adds: collapsible block sidebar, block summary with regime label, indicator cards showing live score/raw value/band, inputs table, scoring bands table, formula display, examples table, interactive "Try It" panel for experimenting with custom inputs, and sparkline charts powered by the `/trend` endpoint. Extended admin sidebar navigation with Engine section.

- **Refactor: IndicatorSparkline, BlockSidebar, and performance**
  Refactored `IndicatorSparkline` to use a single state pattern (loading → error → idle) replacing scattered state flags. Made the admin sidebar collapsible. Enhanced `BlockSidebar` with planned block placeholders (Liquidity, Growth & Employment, Inflation, Risk Sentiment, External) for a visible roadmap. Optimized the trend endpoint with `loadObservationsForBlockOverRange` — batch-loads all observations for the full date window in one DB query, then `BlockEngine.scoreBlockRange` iterates in memory instead of N separate queries.
