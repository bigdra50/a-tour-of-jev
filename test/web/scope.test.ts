import { describe, expect, test } from "bun:test";
import { runUserCode } from "../../src/web/runner/execute.ts";
import type { RunEvent } from "../../src/web/runner/record.ts";
import { createRuntime, formatForLog, toCloneable } from "../../src/web/runner/scope.ts";
import { fakeTransport } from "./fake-transport.ts";

const settings = { provider: "typesafe" as const, model: "jev-latest", llmModel: "openai/gpt-5.6-luna" };

function setup(transport = fakeTransport(), overrides = {}) {
  const events: RunEvent[] = [];
  const runtime = createRuntime(transport, (e) => events.push(e), { ...settings, ...overrides });
  return { events, scope: runtime.globals, runtime, transport };
}

describe("jev()", () => {
  test("既定の経路とモデルを足して送り、呼び出しの開始と終了を記録する", async () => {
    const { events, scope, transport } = setup();
    const result = await runUserCode(
      'const r = await jev({ state: "x", questions: { q: noul("?") } });\nreturn r.answers.q.noul;',
      scope,
    );
    expect(result).toEqual({ ok: true, value: 0.5 });
    expect(transport.bodies[0]).toEqual({
      state: "x",
      questions: { q: { type: "noul", instructions: "?" } },
      provider: "typesafe",
      model: "jev-latest",
    });
    expect(events.map((e) => e.type)).toEqual(["call-start", "call-end"]);
  });

  test("コードで provider を変えたときは既定のモデルを付けない", async () => {
    const { scope, transport } = setup();
    await runUserCode('await jev({ state: "x", questions: { q: noul("?") }, provider: "gateway" });', scope);
    expect(transport.bodies[0]).toEqual({
      state: "x",
      questions: { q: { type: "noul", instructions: "?" } },
      provider: "gateway",
    });
  });

  test("キーが未設定（provider が null）なら provider を送らずサーバーに判断させる", async () => {
    const { scope, transport } = setup(fakeTransport(), { provider: null, model: undefined });
    await runUserCode('await jev({ state: "x", questions: { q: noul("?") } });', scope);
    expect(transport.bodies[0]).toEqual({ state: "x", questions: { q: { type: "noul", instructions: "?" } } });
  });

  test("失敗は例外として学習者のコードに届き、try/catch で拾える", async () => {
    const { scope, events } = setup(fakeTransport({ failWith: { message: "キーが無効です", status: 401 } }));
    const result = await runUserCode(
      'try { await jev({ state: "x", questions: { q: noul("?") } }); } catch (e) { return [e.name, e.status, e.message]; }',
      scope,
    );
    expect(result).toEqual({ ok: true, value: ["JevError", 401, "キーが無効です"] });
    expect(events.at(-1)).toMatchObject({ type: "call-end", ok: false });
  });
});

describe("whenIdle", () => {
  test("await し忘れた呼び出しも終わるまで待てる", async () => {
    const { runtime, events } = setup();
    await runUserCode('jev({ state: "x", questions: { q: noul("?") } });', runtime.globals);
    await runtime.whenIdle();
    expect(events.map((e) => e.type)).toEqual(["call-start", "call-end"]);
  });
});

describe("llm", () => {
  test("model を省略すると設定の LLM を使う", async () => {
    const { scope, transport } = setup();
    await runUserCode('await llm.generate({ prompt: "hi" });', scope);
    expect(transport.bodies[0]).toEqual({ model: "openai/gpt-5.6-luna", prompt: "hi" });
  });
});

describe("print と show", () => {
  test("print は値を 1 行の文字列にする", async () => {
    const { scope, events } = setup();
    await runUserCode('print("p =", 0.5, { a: 1 });', scope);
    expect(events[0]).toEqual({ type: "log", level: "log", text: 'p = 0.5 {\n  "a": 1\n}' });
  });

  test("console.log も print と同じ", async () => {
    const { scope, events } = setup();
    await runUserCode('console.log("x");', scope);
    expect(events[0]).toEqual({ type: "log", level: "log", text: "x" });
  });

  test("show はラベルつきで値を送る", async () => {
    const { scope, events } = setup();
    await runUserCode('show([{ a: 1 }], "表");', scope);
    expect(events[0]).toEqual({ type: "show", label: "表", value: [{ a: 1 }] });
  });
});

describe("toCloneable と formatForLog", () => {
  test("関数・循環参照・Map・Set を送れる形にする", () => {
    const circular: Record<string, unknown> = { name: "c" };
    circular.self = circular;
    expect(toCloneable({ f: function named() {}, circular, m: new Map([["k", 1]]), s: new Set([1, 2]) })).toEqual({
      f: "[関数 named]",
      circular: { name: "c", self: "[循環参照]" },
      m: { k: 1 },
      s: [1, 2],
    });
  });

  test("同じオブジェクトを 2 か所から参照しても循環とはみなさない", () => {
    const shared = { x: 1 };
    expect(toCloneable({ a: shared, b: shared })).toEqual({ a: { x: 1 }, b: { x: 1 } });
  });

  test("undefined と null も表示できる", () => {
    expect(formatForLog([undefined, null])).toBe("undefined null");
  });
});
