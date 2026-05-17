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
