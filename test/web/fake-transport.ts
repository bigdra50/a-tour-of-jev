// テスト用の偽の通信。質問の形から、それらしい答えを組み立てて返す。
// 教材のコードが実 API なしで最後まで動くか（プロパティ名の打ち間違いなど）を確かめるのに使う。

import { err, ok } from "neverthrow";
import type { Answer, Question, Questions } from "../../src/contract/jev.ts";
import type { CallError } from "../../src/web/runner/record.ts";
import type { Transport } from "../../src/web/runner/scope.ts";

function fakeAnswer(question: Question, withDistribution: boolean): Answer {
  switch (question.type) {
    case "noul":
      return { type: "noul", noul: 0.5 };
    case "choice": {
      const options = Object.keys(question.criteria);
      const first = options[0] ?? "";
      if (!withDistribution) return { type: "choice", choice: first };
      const p = 1 / options.length;
      return {
        type: "choice",
        choice: first,
        probabilities: Object.fromEntries(options.map((o) => [o, p])),
        confidence: 0.5,
      };
    }
    case "score": {
      const levels = question.criteria.length;
      const legend = Object.fromEntries(question.criteria.map((level, i) => [String(i), level]));
      const middle = (levels - 1) / 2;
      if (!withDistribution) return { type: "score", score: middle, legend };
      return {
        type: "score",
        score: middle,
        probabilities: Object.fromEntries(question.criteria.map((_, i) => [String(i), 1 / levels])),
        confidence: 0.5,
        legend,
      };
    }
  }
}

export function fakeAnswers(questions: Questions, withDistribution = true): Record<string, Answer> {
  return Object.fromEntries(Object.entries(questions).map(([id, q]) => [id, fakeAnswer(q, withDistribution)]));
}

const meta = (provider: "typesafe" | "gateway" | "llm") => ({
  provider,
  latencyMs: 100,
  costUsd: 0.000001,
  upstream: { method: "POST" as const, url: "https://example.test", headers: {}, body: {} },
  notes: [],
});

export function fakeTransport(options: { failWith?: CallError } = {}): Transport & { bodies: unknown[] } {
  const bodies: unknown[] = [];
  const usage = { input_tokens: 300, output_tokens: 20 };
  return {
    bodies,
    async systemOne(body) {
      bodies.push(body);
      if (options.failWith) return err(options.failWith);
      const { questions, provider } = body as { questions: Questions; provider?: "typesafe" | "gateway" };
      return ok({ model: "jev-1.13.0", answers: fakeAnswers(questions), usage, meta: meta(provider ?? "typesafe") });
    },
    async llmEvaluate(body) {
      bodies.push(body);
      if (options.failWith) return err(options.failWith);
      const { questions, model } = body as { questions: Questions; model: string };
      return ok({ model, answers: fakeAnswers(questions, false), usage, meta: meta("llm") });
    },
    async llmGenerate(body) {
      bodies.push(body);
      if (options.failWith) return err(options.failWith);
      const { model } = body as { model: string };
      return ok({ model, text: "Thanks for reaching out. We'll send a replacement.", usage, meta: meta("llm") });
    },
  };
}
