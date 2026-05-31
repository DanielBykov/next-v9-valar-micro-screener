export type BlockKey = "rates" | "inflation_labor" | "sentiment_risk";

export const SERIES_BY_BLOCK: Record<BlockKey, readonly string[]> = {
  rates: ["DFF", "T10Y2Y", "WALCL", "DGS10", "T10YIE", "DFEDTARU"],
  inflation_labor: [
    "CPIAUCSL",      // CPI All Urban Consumers (headline), SA index
    "CPILFESL",      // CPI Less Food & Energy (core), SA index
    "UNRATE",        // Unemployment rate, %
    "PAYEMS",        // Nonfarm Payrolls, thousands
    "CES0500000003", // Avg Hourly Earnings, total private (level — YoY computed)
    "CIVPART",       // Labor Force Participation Rate, %
  ],
  sentiment_risk: [
    "VIXCLS",        // CBOE VIX (30-day implied vol on S&P 500), daily
    // VVIX is not on FRED — bulk-seeded into indicator_observations via
    // lib/scripts/seed-vvix.ts; excluded here so the FRED fetcher skips it.
  ],
};

export function isBlockKey(value: string): value is BlockKey {
  return Object.prototype.hasOwnProperty.call(SERIES_BY_BLOCK, value);
}
