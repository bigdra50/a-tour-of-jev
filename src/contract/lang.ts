// 画面とメッセージの言語。サーバーとブラウザの両方で使う。

export type Lang = "ja" | "en";

export const LANGS: readonly Lang[] = ["ja", "en"];

/** 言語ごとの文。どちらかの言語が欠けていたら型検査で落ちる。 */
export type Localized = Readonly<Record<Lang, string>>;

/** 言語で変わらない文（英語の固有名など）は、ただの文字列で書いてよい。 */
export type Text = string | Localized;

export const pick = (text: Text, lang: Lang): string => (typeof text === "string" ? text : text[lang]);

/**
 * Accept-Language（"ja,en;q=0.9"）や LANG（"ja_JP.UTF-8"）から言語を決める。
 * 先頭の言語だけを見て、日本語でなければ英語にする。q 値の並べ替えはしない（ブラウザは優先順に送るため）。
 */
export function parseLang(value: string | null | undefined): Lang {
  const first = value?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ja") ? "ja" : "en";
}
