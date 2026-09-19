import { describe, expect, test } from "bun:test";
import { renderMarkdown } from "../../src/web/lib/markdown.ts";

describe("renderMarkdown", () => {
  test("一文一行の改行は、GitHub のコメントと同じく改行として表示する", () => {
    expect(renderMarkdown("一文目です。\n二文目です。")).toBe("<p>一文目です。<br>二文目です。</p>\n");
    expect(renderMarkdown("First sentence.\nSecond sentence.")).toBe("<p>First sentence.<br>Second sentence.</p>\n");
  });

  test("空行は段落を分ける", () => {
    expect(renderMarkdown("段落一。\n\n段落二。")).toBe("<p>段落一。</p>\n<p>段落二。</p>\n");
  });

  test("箇条書き・表は Markdown のとおりに組む", () => {
    const html = renderMarkdown("説明です。\n- 項目\n\n| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<p>説明です。</p>");
    expect(html).toContain("<li>項目</li>");
    expect(html).toContain("<td>1</td>");
  });

  test("段落・コード・リンクを HTML にする", () => {
    const html = renderMarkdown("`noul` を使う。\n続きの文。\n\n[API](https://docs.typesafe.ai/api)");
    expect(html).toContain("<code>noul</code> を使う。<br>続きの文。");
    expect(html).toContain('href="https://docs.typesafe.ai/api"');
  });

  test("外部リンクは新しいタブで開く", () => {
    const html = renderMarkdown("[docs](https://docs.typesafe.ai)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });
});
