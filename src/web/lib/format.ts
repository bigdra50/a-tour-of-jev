// 表示用の数値書式。確率は API と同じ小数、費用はドルと円（概算）で出す。

const twoSignificant = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 2 });
const twoDecimals = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const formatProbability = (p: number): string => p.toFixed(2);

export const formatPercent = (p: number): string => `${Math.round(p * 100)}%`;

export const formatTokens = (n: number): string => integer.format(n);

export const formatMs = (ms: number): string => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);

function formatUsd(usd: number): string {
  if (usd === 0) return "$0";
  return usd >= 0.01 ? `$${twoDecimals.format(usd)}` : `$${twoSignificant.format(usd)}`;
}

function formatJpy(jpy: number): string {
  if (jpy === 0) return "¥0";
  return jpy >= 100 ? `¥${integer.format(jpy)}` : `¥${twoSignificant.format(jpy)}`;
}

/** 単価が分からない呼び出し（null）は表示しない。円は usdJpy の概算。 */
export function formatCost(usd: number | null, usdJpy: number): { usd: string; jpy: string } | null {
  if (usd === null) return null;
  return { usd: formatUsd(usd), jpy: formatJpy(usd * usdJpy) };
}
