import { describe, expect, test } from "bun:test";
import { runUserCode } from "../../src/web/runner/execute.ts";
import { choice, mean, noul, score, stdev } from "../../src/web/runner/helpers.ts";
import { emptyRun, type RunEvent, reduceRun } from "../../src/web/runner/record.ts";

describe("質問ヘルパー（公式 JS SDK と同じ形）", () => {
  test("noul は criteria を省略できる", () => {
    expect(noul("Is it urgent?")).toEqual({ type: "noul", instructions: "Is it urgent?" });
    expect(noul("Is it urgent?", { true: "yes means", false: "no means" })).toEqual({
      type: "noul",
      instructions: "Is it urgent?",
      criteria: { true: "yes means", false: "no means" },
    });
  });

  test("choice と score", () => {
    expect(choice("Which?", { a: null, b: "B" })).toEqual({
      type: "choice",
      instructions: "Which?",
      criteria: { a: null, b: "B" },
    });
    expect(score("How?", ["low", "high"])).toEqual({
      type: "score",
      instructions: "How?",
      criteria: ["low", "high"],
    });
  });
});

describe("統計ヘルパー", () => {
  test("mean と標本標準偏差", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(stdev([0.5])).toBe(0);
  });
});

describe("runUserCode", () => {
  test("トップレベル await と return が使える", async () => {
    const result = await runUserCode("const x = await Promise.resolve(20);\nreturn x + 1;", {});
    expect(result).toEqual({ ok: true, value: 21 });
  });

  test("scope の名前をグローバルのように使える", async () => {
    const result = await runUserCode("return double(4);", { double: (n: number) => n * 2 });
    expect(result).toEqual({ ok: true, value: 8 });
  });

  test("構文エラーは実行前に失敗として返す", async () => {
    const result = await runUserCode("const = 1;", {});
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("syntax");
  });

  test("実行時の例外は行番号つきで返す", async () => {
    const result = await runUserCode("const a = 1;\nthrow new Error('boom');", {});
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.message).toBe("boom");
    expect(!result.ok && result.error.kind).toBe("runtime");
  });

  test("Error 以外が投げられても文字列にする", async () => {
    const result = await runUserCode("throw 'plain';", {});
    expect(!result.ok && result.error.message).toBe("plain");
  });
});

describe("reduceRun", () => {
  const apply = (events: RunEvent[]) => events.reduce(reduceRun, emptyRun());

  test("ログ・表示・呼び出しを起きた順に並べる", () => {
    const run = apply([
      { type: "log", level: "log", text: "hello" },
      { type: "call-start", id: 1, kind: "jev", request: { state: "x" } },
      { type: "show", label: "t", value: { a: 1 } },
      {
        type: "call-end",
        id: 1,
        ok: true,
        response: { model: "m", answers: {}, usage: { input_tokens: 1, output_tokens: 0 } },
      },
      { type: "done", ok: true, value: 3 },
    ]);
    expect(run.items.map((item) => item.type)).toEqual(["log", "call", "show"]);
    expect(run.calls).toHaveLength(1);
    expect(run.calls[0]?.status).toBe("ok");
    expect(run.logs).toEqual(["hello"]);
    expect(run.shown).toEqual([{ label: "t", value: { a: 1 } }]);
    expect(run.status).toBe("done");
    expect(run.returned).toBe(3);
  });

  test("失敗した呼び出しとコードのエラーを記録する", () => {
    const run = apply([
      { type: "call-start", id: 1, kind: "jev", request: {} },
      { type: "call-end", id: 1, ok: false, error: { message: "401", status: 401 } },
      { type: "done", ok: false, error: { kind: "runtime", message: "boom" } },
    ]);
    expect(run.calls[0]?.status).toBe("error");
    expect(run.status).toBe("failed");
    expect(run.error?.message).toBe("boom");
  });
});
