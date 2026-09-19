// Worker から届くイベントと、それを 1 回分の実行記録にまとめる reducer。
// 出力パネルと課題の判定は、どちらもこの記録だけを見る。

import type { LlmEvaluateResponse, LlmGenerateResponse, PlaygroundSystemOneResponse } from "../../contract/jev.ts";
import type { UserCodeError } from "./execute.ts";

export type CallKind = "jev" | "llm-evaluate" | "llm-generate";

/** jev() と llm.evaluate() は同じ答えの形。meta はサーバー経由のとき必ずつく。 */
export type EvaluateResponse = Omit<PlaygroundSystemOneResponse, "meta"> & {
  readonly meta?: PlaygroundSystemOneResponse["meta"];
};
export type CallResponse = EvaluateResponse | LlmEvaluateResponse | LlmGenerateResponse;

export interface CallError {
  readonly message: string;
  readonly status?: number;
  readonly issues?: readonly string[];
  readonly details?: unknown;
}

export type RunEvent =
  | { readonly type: "log"; readonly level: "log" | "warn" | "error"; readonly text: string }
  | { readonly type: "show"; readonly label?: string; readonly value: unknown }
  | { readonly type: "call-start"; readonly id: number; readonly kind: CallKind; readonly request: unknown }
  | { readonly type: "call-end"; readonly id: number; readonly ok: true; readonly response: CallResponse }
  | { readonly type: "call-end"; readonly id: number; readonly ok: false; readonly error: CallError }
  | { readonly type: "done"; readonly ok: true; readonly value?: unknown }
  | { readonly type: "done"; readonly ok: false; readonly error: UserCodeError }
  | { readonly type: "stopped"; readonly reason: "timeout" | "user" };

export type CallRecord =
  | { readonly id: number; readonly kind: CallKind; readonly request: unknown; readonly status: "pending" }
  | {
      readonly id: number;
      readonly kind: CallKind;
      readonly request: unknown;
      readonly status: "ok";
      readonly response: CallResponse;
    }
  | {
      readonly id: number;
      readonly kind: CallKind;
      readonly request: unknown;
      readonly status: "error";
      readonly error: CallError;
    };

export type RunItem =
  | { readonly type: "log"; readonly level: "log" | "warn" | "error"; readonly text: string }
  | { readonly type: "show"; readonly label?: string; readonly value: unknown }
  | { readonly type: "call"; readonly id: number };

export interface RunRecord {
  readonly status: "running" | "done" | "failed" | "stopped";
  /** 起きた順の出力。呼び出しは id で calls を引く。 */
  readonly items: readonly RunItem[];
  readonly calls: readonly CallRecord[];
  readonly logs: readonly string[];
  readonly shown: readonly { readonly label?: string; readonly value: unknown }[];
  readonly returned?: unknown;
  readonly error?: UserCodeError;
  readonly stopReason?: "timeout" | "user";
}

export const emptyRun = (): RunRecord => ({ status: "running", items: [], calls: [], logs: [], shown: [] });

export function reduceRun(run: RunRecord, event: RunEvent): RunRecord {
  switch (event.type) {
    case "log":
      return {
        ...run,
        items: [...run.items, { type: "log", level: event.level, text: event.text }],
        logs: [...run.logs, event.text],
      };
    case "show": {
      const shown = event.label === undefined ? { value: event.value } : { label: event.label, value: event.value };
      return { ...run, items: [...run.items, { type: "show", ...shown }], shown: [...run.shown, shown] };
    }
    case "call-start":
      return {
        ...run,
        items: [...run.items, { type: "call", id: event.id }],
        calls: [...run.calls, { id: event.id, kind: event.kind, request: event.request, status: "pending" }],
      };
    case "call-end":
      return {
        ...run,
        calls: run.calls.map((call): CallRecord => {
          if (call.id !== event.id) return call;
          const base = { id: call.id, kind: call.kind, request: call.request };
          return event.ok
            ? { ...base, status: "ok", response: event.response }
            : { ...base, status: "error", error: event.error };
        }),
      };
    case "done":
      return event.ok
        ? { ...run, status: "done", returned: event.value }
        : { ...run, status: "failed", error: event.error };
    case "stopped":
      return { ...run, status: "stopped", stopReason: event.reason };
  }
}
