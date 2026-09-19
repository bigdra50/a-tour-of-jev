import { describe, expect, test } from "bun:test";
import { APICallError } from "@ai-sdk/provider";
import { Experimental_EvaluationMockModelV4 as MockEvaluationModel } from "ai/test";
import type { Questions } from "../../src/contract/jev.ts";
import { createGatewayJevProvider } from "../../src/server/providers/gateway.ts";

type DoEvaluate = NonNullable<ConstructorParameters<typeof MockEvaluationModel>[0]>["doEvaluate"];

function mockGateway(doEvaluate: DoEvaluate) {
  const seen: { modelIds: string[]; calls: Parameters<NonNullable<DoEvaluate>>[0][] } = {
    modelIds: [],
    calls: [],
  };
  const provider = createGatewayJevProvider({
    evaluationModel: (modelId) => {
      seen.modelIds.push(modelId);
      return new MockEvaluationModel({
        provider: "gateway",
        modelId,
        doEvaluate: async (options) => {
          seen.calls.push(options);
          return (doEvaluate as NonNullable<DoEvaluate>)(options);
        },
      });
    },
  });
  return { provider, seen };
}

const questions: Questions = {
  urgent: { type: "noul", instructions: "Is this urgent?", criteria: { true: "Time-sensitive" } },
  team: {
    type: "choice",
    instructions: "Which team?",
    criteria: { billing: "Payments", technical: null },
  },
  frustration: {
    type: "score",
    instructions: "How frustrated?",
    criteria: ["Calm", { what: "Frustrated" }, "Very angry"],
  },
};

const gatewayAnswers = {
  answers: {
    urgent: { type: "boolean" as const, probability: 0.9 },
    team: { type: "choice" as const, choice: "billing", probabilities: { billing: 0.8, technical: 0.2 } },
    frustration: {
      type: "score" as const,
      score: 1.2,
      probabilities: { "0": 0.1, "1": 0.6, "2": 0.3 },
    },
  },
  usage: { inputTokens: 300, outputTokens: 40 },
  warnings: [],
  providerMetadata: { typesafe: { confidence: { team: 0.61, frustration: 0.47 } } },
  response: { modelId: "typesafe-ai/jev" },
};

describe("createGatewayJevProvider", () => {
  test("noul を AI SDK の boolean に読み替えて送る", async () => {
    const { provider, seen } = mockGateway(async () => gatewayAnswers);
    await provider.evaluate({ state: { message: "hi" }, questions });

    const sent = seen.calls[0];
    expect(sent?.state).toEqual({ message: "hi" });
    expect(sent?.questions.urgent).toEqual({
      type: "boolean",
      instructions: "Is this urgent?",
      criteria: { true: "Time-sensitive" },
    });
    expect(sent?.questions.team).toEqual(questions.team as never);
    expect(sent?.questions.frustration).toEqual(questions.frustration as never);
  });

  test("答えを TypeSafe の形に戻し、confidence と legend を補う", async () => {
    const { provider } = mockGateway(async () => gatewayAnswers);
    const { response } = (await provider.evaluate({ state: "x", questions }))._unsafeUnwrap();

    expect(response.answers.urgent).toEqual({ type: "noul", noul: 0.9 });
    expect(response.answers.team).toEqual({
      type: "choice",
      choice: "billing",
      probabilities: { billing: 0.8, technical: 0.2 },
      confidence: 0.61,
    });
    expect(response.answers.frustration).toEqual({
      type: "score",
      score: 1.2,
      probabilities: { "0": 0.1, "1": 0.6, "2": 0.3 },
      confidence: 0.47,
      legend: { "0": "Calm", "1": { what: "Frustrated" }, "2": "Very angry" },
    });
    expect(response.usage).toEqual({ input_tokens: 300, output_tokens: 40 });
    expect(response.model).toBe("typesafe-ai/jev");
  });

  test("model を省略すると typesafe-ai/jev を使う", async () => {
    const { provider, seen } = mockGateway(async () => gatewayAnswers);
    await provider.evaluate({ state: "x", questions });
    expect(seen.modelIds).toEqual(["typesafe-ai/jev"]);
  });

  test("TypeSafe 形式のモデル名は Gateway のモデル ID に読み替え、注記を残す", async () => {
    const { provider, seen } = mockGateway(async () => gatewayAnswers);
    const result = (await provider.evaluate({ state: "x", questions, model: "jev-1.13.0" }))._unsafeUnwrap();
    expect(seen.modelIds).toEqual(["typesafe-ai/jev"]);
    expect(result.notes.join()).toContain("jev-1.13.0");
  });

  test("instructions の無い質問は空文字で送る（AI SDK では必須のため）", async () => {
    const { provider, seen } = mockGateway(async () => ({
      ...gatewayAnswers,
      answers: { q: { type: "boolean" as const, probability: 0.5 } },
      providerMetadata: { typesafe: { confidence: {} } },
    }));
    await provider.evaluate({ state: "x", questions: { q: { type: "noul" } } });
    expect(seen.calls[0]?.questions.q).toEqual({ type: "boolean", instructions: "" });
  });

  test("trace は Gateway の評価エンドポイントを指し、キーを含めない", async () => {
    const { provider } = mockGateway(async () => gatewayAnswers);
    const { upstream } = (await provider.evaluate({ state: "x", questions }))._unsafeUnwrap();
    expect(upstream.url).toBe("https://ai-gateway.vercel.sh/v4/ai/evaluation-model");
    expect(upstream.headers["ai-model-id"]).toBe("typesafe-ai/jev");
    expect(upstream.headers.Authorization).toBe("Bearer $AI_GATEWAY_API_KEY");
    expect((upstream.body as { questions: Questions }).questions.urgent?.type).toBe("boolean" as never);
  });

  test("上流の HTTP エラーは UpstreamError にする", async () => {
    const { provider } = mockGateway(async () => {
      throw new APICallError({
        message: "Invalid API key",
        url: "https://ai-gateway.vercel.sh/v4/ai/evaluation-model",
        requestBodyValues: {},
        statusCode: 401,
        responseBody: '{"error":{"message":"Invalid API key"}}',
        isRetryable: false,
      });
    });
    const failure = (await provider.evaluate({ state: "x", questions }))._unsafeUnwrapErr();
    expect(failure.kind).toBe("upstream");
    expect(failure.status).toBe(401);
    expect(failure.message).toContain("Invalid API key");
  });
});
