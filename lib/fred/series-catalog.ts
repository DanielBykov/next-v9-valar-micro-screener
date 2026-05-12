export type BlockKey = "rates"; // future: "inflation" | "liquidity" | ...

export const SERIES_BY_BLOCK: Record<BlockKey, readonly string[]> = {
  rates: ["DFF", "T10Y2Y", "WALCL", "DGS10", "T10YIE", "DFEDTARU"],
};

export function isBlockKey(value: string): value is BlockKey {
  return Object.prototype.hasOwnProperty.call(SERIES_BY_BLOCK, value);
}
