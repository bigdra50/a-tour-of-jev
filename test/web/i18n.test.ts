import { describe, expect, test } from "bun:test";
import { detectLang, MESSAGES } from "../../src/web/app/i18n.tsx";

describe("detectLang", () => {
  test("ブラウザの言語設定の先頭が日本語なら日本語", () => {
    expect(detectLang(["ja-JP", "en-US"])).toBe("ja");
    expect(detectLang(["ja"])).toBe("ja");
  });

  test("先頭が日本語以外なら、2 番目以降に日本語があっても英語", () => {
    expect(detectLang(["en-US", "ja"])).toBe("en");
    expect(detectLang(["fr"])).toBe("en");
  });

  test("言語設定が取れなければ英語", () => {
    expect(detectLang([])).toBe("en");
  });
});

describe("費用の表示", () => {
  test("円の概算は日本語の画面だけに出す", () => {
    expect(MESSAGES.ja.approximately("¥1")).not.toBeNull();
    expect(MESSAGES.en.approximately("¥1")).toBeNull();
  });
});
