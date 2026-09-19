import { describe, expect, test } from "bun:test";
import { JEV_USD_PER_INPUT_TOKEN, jevCostUsd, llmCostUsd } from "../../src/contract/pricing.ts";

describe("jevCostUsd", () => {
  test("入力 100 万トークンで 0.042 ドル", () => {
    expect(jevCostUsd({ input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(0.042, 12);
  });

  test("出力トークンは無料", () => {
    expect(jevCostUsd({ input_tokens: 0, output_tokens: 5_000 })).toBe(0);
  });

  test("1 トークンあたりの単価", () => {
    expect(JEV_USD_PER_INPUT_TOKEN).toBeCloseTo(0.042 / 1_000_000, 15);
  });
});

describe("llmCostUsd", () => {
  const price = { inputPerToken: 0.0000002, outputPerToken: 0.0000012 };

  test("入力と出力の両方に課金する", () => {
    expect(llmCostUsd({ input_tokens: 1000, output_tokens: 100 }, price)).toBeCloseTo(
      1000 * 0.0000002 + 100 * 0.0000012,
      12,
    );
  });

  test("単価が不明なら 0 を返さず null を返す", () => {
    expect(llmCostUsd({ input_tokens: 10, output_tokens: 10 }, undefined)).toBeNull();
  });
});
