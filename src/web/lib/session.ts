// 画面上部の「このセッション」の集計。実行記録の差分から、新しく成功した呼び出しだけを足す。

import type { CallRecord, RunRecord } from "../runner/record.ts";

export interface SessionTotals {
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
  /** 単価の分からない LLM を呼んだ。表示の費用は下限になる。 */
  readonly unknownCost: boolean;
}

export const EMPTY_TOTALS: SessionTotals = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  unknownCost: false,
};

type OkCall = Extract<CallRecord, { status: "ok" }>;

export function newlyFinished(previous: RunRecord | undefined, next: RunRecord): OkCall[] {
  const before = new Set(previous?.calls.filter((c) => c.status === "ok").map((c) => c.id) ?? []);
  return next.calls.filter((c): c is OkCall => c.status === "ok" && !before.has(c.id));
}

export function addFinishedCalls(totals: SessionTotals, calls: readonly OkCall[]): SessionTotals {
  return calls.reduce<SessionTotals>((sum, call) => {
    const { usage, meta } = call.response;
    const cost = meta?.costUsd;
    return {
      calls: sum.calls + 1,
      inputTokens: sum.inputTokens + usage.input_tokens,
      outputTokens: sum.outputTokens + usage.output_tokens,
      costUsd: sum.costUsd + (cost ?? 0),
      unknownCost: sum.unknownCost || cost === null || cost === undefined,
    };
  }, totals);
}
