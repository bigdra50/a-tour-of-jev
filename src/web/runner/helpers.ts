// 学習者のコードから使うヘルパー。質問の作り方は公式 JS SDK（@typesafe-ai/sdk）の noul / choice / score と同じ。

import type { ChoiceQuestion, EntryType, NoulQuestion, ScoreQuestion } from "../../contract/jev.ts";

export function noul(instructions?: EntryType, criteria?: NoulQuestion["criteria"]): NoulQuestion {
  return criteria === undefined ? { type: "noul", instructions } : { type: "noul", instructions, criteria };
}

export function choice(instructions: EntryType, criteria: ChoiceQuestion["criteria"]): ChoiceQuestion {
  return { type: "choice", instructions, criteria };
}

export function score(instructions: EntryType, criteria: ScoreQuestion["criteria"]): ScoreQuestion {
  return { type: "score", instructions, criteria };
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** 標本標準偏差（n - 1 で割る）。1 件以下なら 0。 */
export function stdev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}
