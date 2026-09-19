import { describe, expect, test } from "bun:test";
import { joinJapaneseLines, renderMarkdown } from "../../src/web/lib/markdown.ts";

describe("joinJapaneseLines", () => {
  test("日本語の文末で改行した行を、空白を入れずにつなぐ", () => {
    expect(joinJapaneseLines("一文目です。\n二文目です。")).toBe("一文目です。二文目です。");
  });

  test("英字で終わる行は改行を残す（HTML では空白になる）", () => {
    expect(joinJapaneseLines("これは Noul\nです。")).toBe("これは Noul\nです。");
  });

  test("箇条書き・見出し・引用・表・番号つきリストの前ではつながない", () => {
    const source =
      "説明です。\n- 項目\n\n説明です。\n## 見出し\n\n説明です。\n> 引用\n\n説明です。\n| a |\n\n説明です。\n1. 番号";
    expect(joinJapaneseLines(source)).toBe(source);
  });

  test("見出しと表の行は次の行とつながない", () => {
    expect(joinJapaneseLines("## 見出し\n本文です。")).toBe("## 見出し\n本文です。");
    expect(joinJapaneseLines("| 列 |\n本文です。")).toBe("| 列 |\n本文です。");
  });

  test("空行（段落の区切り）は残す", () => {
    expect(joinJapaneseLines("段落一。\n\n段落二。")).toBe("段落一。\n\n段落二。");
  });

  test("コードブロックの中は変えない", () => {
    const source = "説明です。\n```js\n// 日本語。\nconst a = 1;\n```\n後の文です。\n次の文です。";
    expect(joinJapaneseLines(source)).toBe(
      "説明です。\n```js\n// 日本語。\nconst a = 1;\n```\n後の文です。次の文です。",
    );
  });

  test("箇条書きの項目が複数行にまたがるときもつなぐ", () => {
    expect(joinJapaneseLines("- 項目の前半、\n  後半です。")).toBe("- 項目の前半、後半です。");
  });
});

describe("renderMarkdown", () => {
  test("段落・コード・リンクを HTML にする", () => {
    const html = renderMarkdown("`noul` を使う。\n続きの文。\n\n[API](https://docs.typesafe.ai/api)");
    expect(html).toContain("<code>noul</code> を使う。続きの文。");
    expect(html).toContain('href="https://docs.typesafe.ai/api"');
  });

  test("外部リンクは新しいタブで開く", () => {
    const html = renderMarkdown("[docs](https://docs.typesafe.ai)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });
});
