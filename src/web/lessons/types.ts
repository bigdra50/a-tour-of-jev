import type { Localized, Text } from "../../contract/lang.ts";
import type { RunRecord } from "../runner/record.ts";

export type LessonId = string & { readonly __brand: "LessonId" };
export const lessonId = (id: string): LessonId => id as LessonId;

export type PartId = "basics" | "inputs" | "scale" | "workflow" | "limits" | "free";

export interface Part {
  readonly id: PartId;
  readonly title: Localized;
}

export interface CheckResult {
  readonly pass: boolean;
  readonly message: Localized;
}

export interface Exercise {
  /** 課題の文（Markdown）。 */
  readonly goal: Localized;
  readonly hint?: Localized;
  /** 直近 1 回の実行記録だけを見て判定する。判定の処理は言語によらず共通。 */
  readonly check: (run: RunRecord) => CheckResult;
}

export interface DocLink {
  /** ドキュメントのページ名。英語のページ名は言語によらず同じ文字列でよい。 */
  readonly title: Text;
  readonly url: string;
}

export interface Lesson {
  readonly id: LessonId;
  readonly part: PartId;
  readonly title: Localized;
  /** 1 文の要約。目次とページ冒頭に出す。 */
  readonly lead: Localized;
  /** 本文（Markdown、一文一行）。 */
  readonly body: Localized;
  /** エディタの初期コード。言語ごとに注釈と表示用の文が違うだけで、API に送る内容は同じにする。 */
  readonly code: Localized;
  readonly exercise?: Exercise;
  readonly docs: readonly DocLink[];
  /** "llm" は Vercel AI Gateway のキーが要るレッスン。 */
  readonly requires?: "llm";
}
