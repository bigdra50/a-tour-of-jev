import { describe, expect, test } from "bun:test";
import { formatCost, formatMs, formatPercent, formatProbability, formatTokens } from "../../src/web/lib/format.ts";

describe("formatProbability", () => {
  test("小数 2 桁", () => {
    expect(formatProbability(0.8734)).toBe("0.87");
    expect(formatProbability(1)).toBe("1.00");
  });
});

describe("formatPercent", () => {
  test("整数のパーセント", () => {
    expect(formatPercent(0.8734)).toBe("87%");
    expect(formatPercent(0.005)).toBe("1%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("formatTokens", () => {
  test("3 桁区切り", () => {
    expect(formatTokens(1234567)).toBe("1,234,567");
  });
});

describe("formatMs", () => {
  test("1 秒未満はミリ秒、以上は秒", () => {
    expect(formatMs(538.2)).toBe("538 ms");
    expect(formatMs(1534)).toBe("1.53 s");
  });
});

describe("formatCost", () => {
  test("ドルは有効数字 2 桁、円は為替レートで換算", () => {
    expect(formatCost(0.0000123, 150)).toEqual({ usd: "$0.000012", jpy: "¥0.0018" });
  });

  test("大きい金額は小数 2 桁", () => {
    expect(formatCost(12.3456, 150)).toEqual({ usd: "$12.35", jpy: "¥1,852" });
  });

  test("0 はそのまま", () => {
    expect(formatCost(0, 150)).toEqual({ usd: "$0", jpy: "¥0" });
  });

  test("単価不明は null を返す", () => {
    expect(formatCost(null, 150)).toBeNull();
  });
});
