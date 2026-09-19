import type { RunRecord } from "../runner/record.ts";

export type LessonId = string & { readonly __brand: "LessonId" };
export const lessonId = (id: string): LessonId => id as LessonId;

export type PartId = "basics" | "inputs" | "scale" | "workflow" | "limits" | "free";

export interface Part {
  readonly id: PartId;
  readonly title: string;
}

export interface CheckResult {
  readonly pass: boolean;
  readonly message: string;
}

export interface Exercise {
  /** 課題の文（Markdown）。 */
  readonly goal: string;
  readonly hint?: string;
  /** 直近 1 回の実行記録だけを見て判定する。 */
  readonly check: (run: RunRecord) => CheckResult;
}

export interface DocLink {
  readonly title: string;
  readonly url: string;
}

export interface Lesson {
  readonly id: LessonId;
  readonly part: PartId;
  readonly title: string;
  /** 1 文の要約。目次とページ冒頭に出す。 */
  readonly lead: string;
  /** 本文（Markdown、一文一行）。 */
  readonly body: string;
  /** エディタの初期コード。 */
  readonly code: string;
  readonly exercise?: Exercise;
  readonly docs: readonly DocLink[];
  /** "llm" は Vercel AI Gateway のキーが要るレッスン。 */
  readonly requires?: "llm";
}
