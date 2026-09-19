import type { Usage } from "./jev.ts";

// Jev 1.13 の価格は入力 100 万トークンあたり 0.042 ドル、出力は無料。
// 正本: https://docs.typesafe.ai/models （Vercel AI Gateway 経由でも同額）
export const JEV_USD_PER_MTOK_INPUT = 0.042;
export const JEV_USD_PER_INPUT_TOKEN = JEV_USD_PER_MTOK_INPUT / 1_000_000;

export function jevCostUsd(usage: Usage): number {
  return usage.input_tokens * JEV_USD_PER_INPUT_TOKEN;
}

export interface TokenPrice {
  inputPerToken: number;
  outputPerToken: number;
}

/** 単価が分からない LLM は 0 ではなく null を返し、「無料」と誤表示しないようにする。 */
export function llmCostUsd(usage: Usage, price: TokenPrice | undefined): number | null {
  if (!price) return null;
  return usage.input_tokens * price.inputPerToken + usage.output_tokens * price.outputPerToken;
}
