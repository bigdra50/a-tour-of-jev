import { describe, expect, test } from "bun:test";
import { MockLanguageModelV4 } from "ai/test";
import type { Questions } from "../../src/contract/jev.ts";
import { createLlmProvider } from "../../src/server/providers/llm.ts";

function textResult(text: string, inputTokens = 120, outputTokens = 30) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: "stop" },
    usage: {
      inputTokens: { total: inputTokens, noCache: inputTokens, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: outputTokens, text: outputTokens, reasoning: 0 },
    },
    warnings: [],
  };
}

function mockLlm(respond: () => Promise<ReturnType<typeof textResult>>) {
  const prompts: unknown[] = [];
  const provider = createLlmProvider({
    languageModel: (modelId) =>
      new MockLanguageModelV4({
        provider: "gateway",
        modelId,
        doGenerate: async (options) => {
          prompts.push(options.prompt);
          return respond();
        },
      }),
    price: async (modelId) =>
      modelId === "openai/gpt-5.6-luna" ? { inputPerToken: 0.0000002, outputPerToken: 0.0000012 } : undefined,
  });
  return { provider, prompts };
}

const questions: Questions = {
  urgent: { type: "noul", instructions: "Is this urgent?" },
  team: { type: "choice", instructions: "Which team?", criteria: { billing: null, tech: null } },
  frustration: { type: "score", instructions: "How frustrated?", criteria: ["Calm", "Angry"] },
};

describe("createLlmProvider.evaluate", () => {
  test("同じ質問を LLM で評価し、Jev と同じ形（分布なし）で返す", async () => {
    // AI SDK の LLM アダプタは質問を q0, q1, ... 、選択肢を c0, c1, ... という内部コードで扱う。
    const { provider } = mockLlm(async () => textResult(JSON.stringify({ q0: 0.8, q1: "c0", q2: 0.7 })));

    const result = (await provider.evaluate({ model: "openai/gpt-5.6-luna", state: "x", questions }))._unsafeUnwrap();

    expect(result.response.answers.urgent).toEqual({ type: "noul", noul: 0.8 });
    expect(result.response.answers.team).toEqual({ type: "choice", choice: "billing" });
    expect(result.response.answers.frustration).toEqual({
      type: "score",
      score: 0.7,
      legend: { "0": "Calm", "1": "Angry" },
    });
    expect(result.response.usage).toEqual({ input_tokens: 120, output_tokens: 30 });
    expect(result.response.model).toBe("openai/gpt-5.6-luna");
    expect(result.costUsd).toBeCloseTo(120 * 0.0000002 + 30 * 0.0000012, 12);
  });

  test("単価の分からないモデルは costUsd を null にする", async () => {
    const { provider } = mockLlm(async () => textResult(JSON.stringify({ q0: 0.5 })));
    const result = (
      await provider.evaluate({
        model: "unknown/model",
        state: "x",
        questions: { urgent: { type: "noul", instructions: "?" } },
      })
    )._unsafeUnwrap();
    expect(result.costUsd).toBeNull();
  });
});

describe("createLlmProvider.generate", () => {
  test("テキストを生成し、使ったトークンと費用を返す", async () => {
    const { provider, prompts } = mockLlm(async () => textResult("こんにちは", 50, 10));
    const result = (
      await provider.generate({ model: "openai/gpt-5.6-luna", prompt: "挨拶して", system: "丁寧に" })
    )._unsafeUnwrap();
    expect(result.text).toBe("こんにちは");
    expect(result.usage).toEqual({ input_tokens: 50, output_tokens: 10 });
    expect(result.costUsd).toBeCloseTo(50 * 0.0000002 + 10 * 0.0000012, 12);
    expect(JSON.stringify(prompts[0])).toContain("丁寧に");
    expect(JSON.stringify(prompts[0])).toContain("挨拶して");
  });
});
