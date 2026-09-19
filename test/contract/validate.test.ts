import { describe, expect, test } from "bun:test";
import {
  validateLlmEvaluateRequest,
  validateLlmGenerateRequest,
  validateSystemOneRequest,
} from "../../src/contract/validate.ts";

const noulQ = { type: "noul" as const, instructions: "Is this urgent?" };

describe("validateSystemOneRequest", () => {
  test("最小のリクエストを受け付ける", () => {
    const result = validateSystemOneRequest({ state: "hello", questions: { q: noulQ } });
    expect(result).toEqual({ ok: true, value: { state: "hello", questions: { q: noulQ } } });
  });

  test("state はオブジェクトと配列も受け付ける", () => {
    expect(validateSystemOneRequest({ state: { a: 1 }, questions: { q: noulQ } }).ok).toBe(true);
    expect(validateSystemOneRequest({ state: ["a", "b"], questions: { q: noulQ } }).ok).toBe(true);
  });

  test("model と provider を引き継ぐ", () => {
    const result = validateSystemOneRequest({
      state: "x",
      questions: { q: noulQ },
      model: "jev-1.13.0",
      provider: "gateway",
    });
    expect(result.ok && result.value.model).toBe("jev-1.13.0");
    expect(result.ok && result.value.provider).toBe("gateway");
  });

  test("本文がオブジェクトでなければ拒否する", () => {
    for (const body of [null, "text", 1, []]) {
      const result = validateSystemOneRequest(body);
      expect(result.ok).toBe(false);
    }
  });

  test("state が無い・数値・null なら拒否する", () => {
    for (const state of [undefined, 1, true, null]) {
      const result = validateSystemOneRequest({ state, questions: { q: noulQ } });
      expect(result.ok).toBe(false);
      expect(!result.ok && result.issues.join()).toContain("state");
    }
  });

  test("questions が空・配列なら拒否する", () => {
    for (const questions of [{}, [], undefined]) {
      const result = validateSystemOneRequest({ state: "x", questions });
      expect(result.ok).toBe(false);
      expect(!result.ok && result.issues.join()).toContain("questions");
    }
  });

  test("未知の type を質問 ID つきで報告する", () => {
    const result = validateSystemOneRequest({
      state: "x",
      questions: { mine: { type: "boolean", instructions: "?" } },
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues[0]).toContain("questions.mine.type");
  });

  test("Choice の選択肢は 1〜255 個", () => {
    const empty = validateSystemOneRequest({
      state: "x",
      questions: { c: { type: "choice", instructions: "?", criteria: {} } },
    });
    expect(empty.ok).toBe(false);
    expect(!empty.ok && empty.issues[0]).toContain("questions.c.criteria");

    const tooMany = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`o${i}`, null]));
    const over = validateSystemOneRequest({
      state: "x",
      questions: { c: { type: "choice", instructions: "?", criteria: tooMany } },
    });
    expect(over.ok).toBe(false);

    const max = Object.fromEntries(Array.from({ length: 255 }, (_, i) => [`o${i}`, null]));
    const ok = validateSystemOneRequest({
      state: "x",
      questions: { c: { type: "choice", instructions: "?", criteria: max } },
    });
    expect(ok.ok).toBe(true);
  });

  test("Choice の criteria が配列なら拒否する", () => {
    const result = validateSystemOneRequest({
      state: "x",
      questions: { c: { type: "choice", instructions: "?", criteria: ["a", "b"] } },
    });
    expect(result.ok).toBe(false);
  });

  test("Score のレベルは 2〜10 個の配列", () => {
    const levels = (n: number) => Array.from({ length: n }, (_, i) => `level ${i}`);
    const run = (criteria: unknown) =>
      validateSystemOneRequest({
        state: "x",
        questions: { s: { type: "score", instructions: "?", criteria } },
      }).ok;
    expect(run(levels(1))).toBe(false);
    expect(run(levels(2))).toBe(true);
    expect(run(levels(10))).toBe(true);
    expect(run(levels(11))).toBe(false);
    expect(run({ 0: "a", 1: "b" })).toBe(false);
  });

  test("Noul の criteria は true / false だけを持つオブジェクト", () => {
    const run = (criteria: unknown) =>
      validateSystemOneRequest({
        state: "x",
        questions: { n: { type: "noul", instructions: "?", criteria } },
      }).ok;
    expect(run({ true: "yes means...", false: "no means..." })).toBe(true);
    expect(run({ true: "only yes" })).toBe(true);
    expect(run(null)).toBe(true);
    expect(run({ yes: "wrong key" })).toBe(false);
    expect(run("text")).toBe(false);
  });

  test("instructions と説明はオブジェクト・配列・null を受け付け、数値は拒否する", () => {
    const structured = validateSystemOneRequest({
      state: "x",
      questions: {
        c: {
          type: "choice",
          instructions: { question: "Which team?", focus: ["a", "b"] },
          criteria: { billing: { what: "Charges", examples: ["x"] }, other: null },
        },
      },
    });
    expect(structured.ok).toBe(true);

    const numeric = validateSystemOneRequest({
      state: "x",
      questions: { n: { type: "noul", instructions: 42 } },
    });
    expect(numeric.ok).toBe(false);
  });

  test("provider は typesafe か gateway", () => {
    const result = validateSystemOneRequest({ state: "x", questions: { q: noulQ }, provider: "x" });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.issues.join()).toContain("provider");
  });

  test("問題をすべて列挙する", () => {
    const result = validateSystemOneRequest({
      state: 1,
      questions: { a: { type: "nope" }, b: { type: "score", criteria: ["one"] } },
    });
    expect(!result.ok && result.issues.length).toBe(3);
  });
});

describe("validateLlmEvaluateRequest", () => {
  test("model が必須", () => {
    expect(validateLlmEvaluateRequest({ state: "x", questions: { q: noulQ } }).ok).toBe(false);
    const ok = validateLlmEvaluateRequest({
      model: "openai/gpt-5.6-luna",
      state: "x",
      questions: { q: noulQ },
    });
    expect(ok.ok).toBe(true);
  });
});

describe("validateLlmGenerateRequest", () => {
  test("model と prompt が必須", () => {
    expect(validateLlmGenerateRequest({ model: "m" }).ok).toBe(false);
    expect(validateLlmGenerateRequest({ prompt: "p" }).ok).toBe(false);
    const ok = validateLlmGenerateRequest({ model: "m", prompt: "p", system: "s" });
    expect(ok).toEqual({ ok: true, value: { model: "m", prompt: "p", system: "s" } });
  });

  test("maxOutputTokens は正の整数", () => {
    expect(validateLlmGenerateRequest({ model: "m", prompt: "p", maxOutputTokens: 0 }).ok).toBe(false);
    expect(validateLlmGenerateRequest({ model: "m", prompt: "p", maxOutputTokens: 200 }).ok).toBe(true);
  });
});
