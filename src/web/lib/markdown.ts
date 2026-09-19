import { Marked, type Tokens } from "marked";

const escapeAttr = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// 教材の本文は一文一行で書いている。GitHub のコメントと同じく、改行はそのまま改行として表示する（breaks）。
const marked = new Marked({
  gfm: true,
  breaks: true,
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
  return marked.parse(source, { async: false });
}
