export type BlockKey =
  | "rates"
  | "inflation_labor"
  | "sentiment_risk"
  | "commodities_global"
  | "business_cycle";

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
  commodities_global: [
    "DCOILWTICO",    // Crude Oil WTI spot, USD/bbl, daily
    "DTWEXBGS",      // Nominal Broad U.S. Dollar Index, daily
    "PCOPPUSDM",     // LME Copper average, USD/MT, monthly
    "SOFR",          // Secured Overnight Financing Rate, %, daily
    "IORB",          // Interest on Reserve Balances, %, daily (since Jul 2021)
    // GOLD_SPOT: not on FRED — bulk-seeded via lib/scripts/seed-gold.ts
    // GLOBAL_MFG_PMI: manual input via /admin/manual-inputs (paywalled source)
  ],
  business_cycle: [
    "BAMLH0A0HYM2",  // ICE BofA US High Yield Index OAS, bps, daily (5.5)
    // ISM_MFG_PMI, CB_LEI_YOY, IWM_SPY_RATIO_90D_PCT, SPYG_SPYV_RATIO_90D_PCT,
    // IPO_TRAILING_12M_PROCEEDS: manual inputs — bulk-seeded via
    // lib/scripts/seed-block5-manual.ts; excluded so the FRED fetcher skips them.
  ],
};

export function isBlockKey(value: string): value is BlockKey {
  return Object.prototype.hasOwnProperty.call(SERIES_BY_BLOCK, value);
}
