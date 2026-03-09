# VALAR Macro Screener — Macro Pulse Intelligence System

## Overview
A structured macroeconomic dashboard prototype that calculates and displays a Macro Pulse Score (0–120) across 6 macro domains with 36 total metrics. Uses a dark tech institutional terminal design for professional macro risk intelligence.

## Architecture
- **Framework**: Next.js 15 (App Router, webpack)
- **Frontend**: React 19, Tailwind CSS v4, Recharts, Radix UI components
- **Database**: PostgreSQL with Drizzle ORM
- **API**: Next.js Route Handlers (`app/api/`)

## Data Model
- `snapshots` — Main snapshot record (date, total score, regime, comparisons, interpretation)
- `blocks` — 6 macro domain blocks linked to a snapshot (score out of 20)
- `metrics` — 36 individual metrics linked to blocks (score out of 5)
- `trendPoints` — Monthly historical trend data linked to a snapshot

## Key Files
- `shared/schema.ts` — Drizzle schema definitions and types
- `lib/db.ts` — Database connection pool
- `lib/storage.ts` — Storage interface (DatabaseStorage with Drizzle queries)
- `lib/seed.ts` — Seeds the database with the Feb 2026 mock snapshot (idempotent)
- `app/api/dashboard/route.ts` — GET endpoint serving all dashboard data
- `app/page.tsx` — Page entry point (dynamic import, ssr: false)
- `app/components/dashboard.tsx` — Main dashboard UI (client component)
- `app/layout.tsx` — Root layout with metadata and font loading
- `app/globals.css` — Dark tech terminal theme CSS variables with glow utilities
- `app/components/ui/` — UI components (button, tooltip, collapsible)
- `lib/utils.ts` — Utility functions (cn)
- `next.config.mjs` — Next.js configuration
- `postcss.config.mjs` — PostCSS configuration for Tailwind v4
- `drizzle.config.ts` — Drizzle Kit configuration

## API Endpoints
- `GET /api/dashboard` — Returns snapshot, blocks (with metrics + drivers), all metrics, and trend data

## Design
- Dark tech terminal theme (#0F172A background, #111827 panels, #1E293B cards)
- Semi-circle gauge dial with 5 regime color bands and animated needle
- Structured summary panel with KPI rows (not cards)
- 6 domain block cards (2x3 grid) with all 6 metrics per block, mini progress bars, signal badges, and colored border glow
- 12-month trend line chart with regime zone shading and custom tooltip
- Collapsible 36-metric intelligence panel table
- Accent colors: emerald (risk-on), teal (constructive), blue (neutral), amber (fragile), red (risk-off)
- Fonts: Inter (body) + JetBrains Mono (data/mono), loaded via next/font/google

## Environment Notes
- `reactStrictMode: false` in next.config.mjs — required to prevent Replit proxy-injected HTML from triggering React 19 hydration mismatch errors in the dev overlay
- `suppressHydrationWarning` on `<html>` and `<body>` in layout.tsx — additional safety for Replit proxy modifications
- `allowedDevOrigins` includes `127.0.0.1` and Replit domains to prevent cross-origin request blocks
- `webpack.watchOptions.ignored` restricts file watching to `app/`, `lib/`, `shared/` dirs to prevent infinite rebuild loops on Replit's FUSE filesystem
- Dashboard uses `dynamic(() => import(...), { ssr: false })` to avoid hydration mismatches entirely
- `app/global-error.tsx` — catches unrecoverable errors with consistent dark-theme styling
