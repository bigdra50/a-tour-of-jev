import { describe, expect, test } from "bun:test";
import { addFinishedCalls, EMPTY_TOTALS, newlyFinished } from "../../src/web/lib/session.ts";
import { emptyRun, type RunEvent, type RunRecord, reduceRun } from "../../src/web/runner/record.ts";

const meta = (costUsd: number | null) => ({
  provider: "typesafe" as const,
  latencyMs: 10,
  costUsd,
  upstream: { method: "POST" as const, url: "u", headers: {}, body: {} },
  notes: [],
});

const response = (input: number, costUsd: number | null) => ({
  model: "jev-1.13.0",
  answers: {},
  usage: { input_tokens: input, output_tokens: 5 },
  meta: meta(costUsd),
});

const apply = (run: RunRecord, ...events: RunEvent[]) => events.reduce(reduceRun, run);

describe("newlyFinished", () => {
  test("前回の記録では終わっていなかった成功呼び出しだけを返す", () => {
    const started = apply(
      emptyRun(),
      { type: "call-start", id: 1, kind: "jev", request: {} },
      { type: "call-start", id: 2, kind: "jev", request: {} },
    );
    const oneDone = apply(started, { type: "call-end", id: 1, ok: true, response: response(100, 0.1) });
    const bothDone = apply(oneDone, { type: "call-end", id: 2, ok: false, error: { message: "x" } });

    expect(newlyFinished(started, oneDone).map((c) => c.id)).toEqual([1]);
    expect(newlyFinished(oneDone, bothDone)).toEqual([]);
    expect(newlyFinished(undefined, oneDone).map((c) => c.id)).toEqual([1]);
  });
});

describe("addFinishedCalls", () => {
  test("回数・トークン・費用を足す。費用が分からない呼び出しは印をつける", () => {
    const run = apply(
      emptyRun(),
      { type: "call-start", id: 1, kind: "jev", request: {} },
      { type: "call-end", id: 1, ok: true, response: response(100, 0.001) },
      { type: "call-start", id: 2, kind: "llm-generate", request: {} },
      { type: "call-end", id: 2, ok: true, response: response(50, null) },
    );
    const totals = addFinishedCalls(EMPTY_TOTALS, newlyFinished(undefined, run));
    expect(totals).toEqual({ calls: 2, inputTokens: 150, outputTokens: 10, costUsd: 0.001, unknownCost: true });
  });
});
