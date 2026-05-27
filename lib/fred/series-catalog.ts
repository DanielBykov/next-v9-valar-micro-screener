export type BlockKey = "rates" | "inflation_labor"; // future: "sentiment_risk" | ...

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
};

export function isBlockKey(value: string): value is BlockKey {
  return Object.prototype.hasOwnProperty.call(SERIES_BY_BLOCK, value);
}
