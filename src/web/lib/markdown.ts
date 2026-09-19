import { Marked, type Tokens } from "marked";

// 教材の本文は「一文一行」で書いている。
// HTML では行末の改行が空白になり、日本語の文の間に余計な空白が入るので、日本語どうしの改行はつなぐ。
const ENDS_WITH_CJK = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]$/;
// 1 行で完結するブロック（見出し・表の行）は、次の行とつなぐと意味が変わる。
const SINGLE_LINE_BLOCK = /^\s*[#|]/;
// 次の行が新しいブロックの始まりなら、つながない。
const STARTS_BLOCK = /^\s*(?:[-*+]\s|\d+\.\s|[#>|]|```|$)/;

export function joinJapaneseLines(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    const previous = out.at(-1);
    const joinable =
      !inFence &&
      previous !== undefined &&
      ENDS_WITH_CJK.test(previous) &&
      !SINGLE_LINE_BLOCK.test(previous) &&
      !STARTS_BLOCK.test(line);
    if (joinable) {
      out[out.length - 1] = previous + line.trimStart();
    } else {
      out.push(line);
    }
    if (line.trimStart().startsWith("```")) inFence = !inFence;
  }
  return out.join("\n");
}

const escapeAttr = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const marked = new Marked({
  gfm: true,
  renderer: {
    link(this: { parser: { parseInline(tokens: Tokens.Generic[]): string } }, { href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      const target = external ? ' target="_blank" rel="noreferrer"' : "";
      return `<a href="${escapeAttr(href)}"${titleAttr}${target}>${text}</a>`;
    },
  },
});

/** 教材の本文（信頼できる入力）を HTML にする。 */
export function renderMarkdown(source: string): string {
  return marked.parse(joinJapaneseLines(source), { async: false });
}
