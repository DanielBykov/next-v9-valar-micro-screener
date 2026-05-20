# Admin Pages Overview

Your macro screener admin panel is built on Next.js with a clean, dark-themed UI. Here's the structure:

## Navigation Structure (app/admin/sidebar.tsx:13-18)
- **Overview** (`/admin`) - Dashboard with key metrics
- **Database** (`/admin/database`) - Mock data management
- **FRED** (`/admin/fred`) - Federal Reserve Economic Data management
- **Indicators** (`/admin/indicators`) - Economic indicator browsing

## Authentication (app/admin/layout.tsx:9-14)
- Session-based auth using cookies and JWT verification
- `AdminAuthContext` provides auth state throughout admin pages
- Login/logout buttons in header
- `LoginDialog` component for authentication prompts

## Pages

### 1. Overview Page (`/admin/page.tsx`)
Three main cards with real-time data:
- **Latest Snapshot Card** - Shows current dashboard regime (Risk-on/Neutral/Fragile), total score, and comparisons vs yesterday/3m/1y averages
- **Data Coverage Card** - Displays total observations across all FRED series with date ranges and per-series counts
- **Fetch Status Card** - Shows data freshness per series with color-coded indicators (Fresh/Stale/Old), includes "Fetch Now" button for authenticated users

### 2. Database Page (`/admin/database/page.tsx`)
- Contains `MockDataSection` component
- Manages mock/test data

### 3. FRED Page (`/admin/fred/page.tsx`)
- `CoverageTable` - Shows data coverage by series
- `FredSection` - FRED data fetching controls
- Refreshes coverage table after data fetch completion

### 4. Indicators Page (`/admin/indicators/page.tsx`)
- `CoverageTable` with month-click filtering
- `IndicatorsTable` - Displays filtered indicator data based on selected month
- Enables drill-down exploration of economic indicators by time period

## Key Components

### Shared Components (`app/admin/_components/`)
- `admin-auth-context.tsx` - Auth state management with login prompts
- `sidebar.tsx` - Navigation with Lucide icons
- `login-button.tsx` / `logout-button.tsx` - Auth controls
- `login-dialog.tsx` - Authentication modal
- `coverage-table.tsx` - Reusable data coverage display

## Visual Design
- Dark theme with slate/gray color palette (`#0F172A`, `#111827`, `#334155`)
- Color-coded status indicators (emerald for fresh, amber for stale, red for old)
- Monospace fonts for data display
- Lucide React icons throughout

## API Integration
The admin pages connect to these API endpoints:
- `/api/admin/indicators/freshness` - Data freshness metrics
- `/api/admin/indicators/coverage` - Coverage statistics
- `/api/admin/fetch-indicators` - Trigger data fetches
- `/api/dashboard` - Latest snapshot data
