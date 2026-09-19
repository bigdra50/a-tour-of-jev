import { describe, expect, test } from "bun:test";
import { LANGS, type Lang, parseLang, pick } from "../../src/contract/lang.ts";

describe("parseLang", () => {
  test.each<[string, Lang]>([
    ["ja", "ja"],
    ["JA", "ja"],
    ["ja-JP", "ja"],
    ["ja_JP.UTF-8", "ja"],
    ["ja,en-US;q=0.9,en;q=0.8", "ja"],
    ["en", "en"],
    ["en-US,ja;q=0.9", "en"],
    ["fr-FR", "en"],
    ["C.UTF-8", "en"],
  ])("%s は %s", (value, expected) => {
    expect(parseLang(value)).toBe(expected);
  });

  test("値が無ければ英語", () => {
    expect(parseLang(undefined)).toBe("en");
    expect(parseLang(null)).toBe("en");
    expect(parseLang("")).toBe("en");
  });
});

describe("pick", () => {
  test("言語ごとの文から、その言語の文を選ぶ", () => {
    expect(pick({ ja: "目次", en: "Contents" }, "en")).toBe("Contents");
    expect(pick({ ja: "目次", en: "Contents" }, "ja")).toBe("目次");
  });

  test("ただの文字列は、どの言語でもそのまま", () => {
    expect(pick("Speculative fan-out", "ja")).toBe("Speculative fan-out");
  });
});

test("対応する言語は日本語と英語", () => {
  expect(LANGS).toEqual(["ja", "en"]);
});
