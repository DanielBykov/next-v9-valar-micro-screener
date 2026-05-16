# API

## Routes

### Dashboard

#### `GET /api/dashboard`
Returns complete dashboard data: snapshot, blocks with metrics, drivers, and trend data.

| Query Param  | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `snapshotId`| number | no       | Specific snapshot ID                 |
| `date`      | string | no       | Snapshot by date                     |

If neither param provided, returns the latest snapshot. Seeds database on first request.

**Response**: `{ snapshot, blocks, metrics, trend }`
**Errors**: 400 (invalid snapshotId), 404 (not found), 500

#### `GET /api/snapshots`
Returns list of all available snapshots.

**Response**: JSON array of snapshots
**Errors**: 500

---

### Admin

#### `POST /api/admin/clear`
Clears all data from the database (snapshots, blocks, metrics, trendPoints).

**Response**: `{ message: string }`
**Errors**: 500

#### `GET /api/admin/fred`
Proxy to FRED API for fetching economic indicators.

| Query Param | Type   | Required | Default | Description               |
|------------|--------|----------|---------|---------------------------|
| `series`   | string | no       | `"DFF"` | FRED series ID            |
| `start`    | string | yes      |         | Start date                |
| `end`      | string | yes      |         | End date                  |

**Env**: `FRED_API` (API key)
**Response**: FRED API JSON with observations
**Errors**: 400 (missing start/end), 500 (no API key)

#### `POST /api/admin/fetch-indicators`
Fetches and stores economic indicators for a specific block.

| Query Param | Type   | Required | Description                        |
|------------|--------|----------|------------------------------------|
| `block`    | string | yes      | Block identifier (validated)       |
| `start`    | string | no       | Start date (YYYY-MM-DD)            |
| `end`      | string | no       | End date (YYYY-MM-DD)              |

**Env**: `FRED_API` (API key)
**Response**: `{ results: [{ status, ... }] }`
**Errors**: 400 (invalid params), 500 (no API key), 502 (fetch failed)

---

### Auth

#### `POST /api/auth/login`
Authenticates admin user and creates session cookie.

**Body**: `{ password: string }`
**Env**: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
**Response**: `{ ok: true }`
**Errors**: 400 (invalid request), 401 (wrong password), 500 (env not configured)

#### `POST /api/auth/logout`
Clears session cookie.

**Response**: `{ ok: true }`

---

## External Data Sources

- **FRED API** (Federal Reserve Economic Data) — primary source for economic indicators
  - Docs: https://fred.stlouisfed.org/docs/api/fred/
  - Requires API key (`FRED_API` env var)
  - Example series: [FEDFUNDS](https://fred.stlouisfed.org/series/FEDFUNDS)
- **New York Fed Markets Data APIs** — official daily source for EFFR
  - Docs: https://markets.newyorkfed.org/static/docs/markets-api.html
