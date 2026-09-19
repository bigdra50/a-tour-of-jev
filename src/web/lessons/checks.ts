// 課題の判定に使う小さな道具。どれも実行記録（RunRecord）だけを見る純粋関数。

import type { Answer, Questions, State } from "../../contract/jev.ts";
import type { CallKind, CallRecord, RunRecord } from "../runner/record.ts";
import type { CheckResult } from "./types.ts";

type OkCall = Extract<CallRecord, { status: "ok" }>;

export interface EvaluatedCall {
  readonly kind: CallKind;
  readonly state: State | undefined;
  readonly questions: Questions;
  readonly answers: Readonly<Record<string, Answer>>;
}

const isOk = (call: CallRecord): call is OkCall => call.status === "ok";

/** 成功した評価（jev と llm.evaluate）を起きた順に並べる。 */
export function evaluatedCalls(run: RunRecord, kind: CallKind = "jev"): EvaluatedCall[] {
  return run.calls.filter(isOk).flatMap((call) => {
    if (call.kind !== kind || !("answers" in call.response)) return [];
    const request = (call.request ?? {}) as { state?: State; questions?: Questions };
    return [{ kind, state: request.state, questions: request.questions ?? {}, answers: call.response.answers }];
  });
}

/** 質問 ID を含む、いちばん新しい jev 呼び出し。 */
export function lastCallWith(run: RunRecord, questionId: string): EvaluatedCall | undefined {
  return evaluatedCalls(run).findLast((call) => questionId in call.answers);
}

export function lastAnswer(run: RunRecord, questionId: string): Answer | undefined {
  return lastCallWith(run, questionId)?.answers[questionId];
}

/** show() した値のうち、いちばん新しい「オブジェクトの配列」（表）。 */
export function lastTable(run: RunRecord): readonly Record<string, unknown>[] | undefined {
  const table = run.shown.findLast(
    ({ value }) =>
      Array.isArray(value) && value.length > 0 && value.every((row) => typeof row === "object" && row !== null),
  );
  return table?.value as Record<string, unknown>[] | undefined;
}

export const pass = (message: string): CheckResult => ({ pass: true, message });
export const fail = (message: string): CheckResult => ({ pass: false, message });

export const notRunYet = fail("まだ実行されていないか、呼び出しが失敗しました。コードを実行してください");

export const round2 = (x: number): string => x.toFixed(2);
