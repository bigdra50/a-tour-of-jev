import { describe, expect, test } from "bun:test";
import { errAsync, okAsync } from "neverthrow";
import type {
  ApiErrorBody,
  LlmEvaluateResponse,
  LlmGenerateResponse,
  PlaygroundSystemOneResponse,
  StatusResponse,
  SystemOneRequest,
} from "../../src/contract/jev.ts";
import { type ApiDeps, createApi } from "../../src/server/api.ts";
import { upstreamFailure } from "../../src/server/providers/errors.ts";
import type { LlmProvider } from "../../src/server/providers/llm.ts";
import type { JevProvider } from "../../src/server/providers/types.ts";

const answer = {
  model: "jev-1.13.0",
  answers: { urgent: { type: "noul" as const, noul: 0.9 } },
  usage: { input_tokens: 1_000, output_tokens: 20 },
};
const trace = { method: "POST" as const, url: "https://example.test", headers: {}, body: {} };

function fakeJev(id: "typesafe" | "gateway", seen: SystemOneRequest[] = []): JevProvider {
  return {
    id,
    models: [`${id}-model`],
    evaluate: (request) => {
      seen.push(request);
      return okAsync({ response: answer, upstream: trace, notes: [`${id} note`] });
    },
  };
}

const fakeLlm: LlmProvider = {
  evaluate: (request) =>
    okAsync({
      response: { model: request.model, answers: { urgent: { type: "noul", noul: 0.7 } }, usage: answer.usage },
      upstream: trace,
      costUsd: 0.001,
    }),
  generate: (request) =>
    okAsync({ model: request.model, text: "hello", usage: answer.usage, upstream: trace, costUsd: null }),
};

let clock = 0;
function api(overrides: Partial<ApiDeps> = {}) {
  return createApi({
    credentials: {
      typesafe: { key: "ts_secret_value_1234", from: "TYPESAFE_API_KEY（環境変数）" },
      gateway: { key: "vck_secret_value_5678", from: "AI_GATEWAY_API_KEY（.env.local）" },
      notes: ["a note"],
    },
    jev: { typesafe: fakeJev("typesafe"), gateway: fakeJev("gateway") },
    llm: fakeLlm,
    llmModels: async () => [
      { id: "openai/gpt-5.6-luna", name: "GPT 5.6 Luna", inputPerToken: 2e-7, outputPerToken: 1.2e-6 },
    ],
    now: () => {
      clock += 25;
      return clock;
    },
    ...overrides,
  });
}

const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const validBody = { state: "Help!", questions: { urgent: { type: "noul", instructions: "Urgent?" } } };

describe("GET /api/status", () => {
  test("設定済みの経路とモデルを返し、キーの値は含めない", async () => {
    const response = await api()(new Request("http://localhost/api/status"));
    expect(response?.status).toBe(200);
    const text = await response?.text();
    expect(text).not.toContain("secret_value");
    const body = JSON.parse(text ?? "") as StatusResponse;
    expect(body.providers.typesafe).toEqual({
      configured: true,
      from: "TYPESAFE_API_KEY（環境変数）",
      masked: "ts_…1234",
    });
    expect(body.providers.gateway.masked).toBe("vck_…5678");
    expect(body.defaultProvider).toBe("typesafe");
    expect(body.llmAvailable).toBe(true);
    expect(body.jevModels).toEqual({ typesafe: ["typesafe-model"], gateway: ["gateway-model"] });
    expect(body.llmModels[0]?.id).toBe("openai/gpt-5.6-luna");
    expect(body.notes).toEqual(["a note"]);
  });

  test("TypeSafe のキーが無ければ Gateway を既定にする", async () => {
    const response = await api({
      credentials: { gateway: { key: "vck_x_1234567", from: "x" }, notes: [] },
      jev: { gateway: fakeJev("gateway") },
    })(new Request("http://localhost/api/status"));
    const body = (await response?.json()) as StatusResponse;
    expect(body.providers.typesafe).toEqual({ configured: false });
    expect(body.defaultProvider).toBe("gateway");
  });

  test("キーが 1 つも無ければ既定は null", async () => {
    const response = await api({ credentials: { notes: [] }, jev: {}, llm: undefined })(
      new Request("http://localhost/api/status"),
    );
    const body = (await response?.json()) as StatusResponse;
    expect(body.defaultProvider).toBeNull();
    expect(body.llmAvailable).toBe(false);
  });
});

describe("POST /api/systemone", () => {
  test("既定の経路で呼び、所要時間と費用を meta に足す", async () => {
    const seen: SystemOneRequest[] = [];
    const response = await api({ jev: { typesafe: fakeJev("typesafe", seen) } })(post("/api/systemone", validBody));
    expect(response?.status).toBe(200);
    const body = (await response?.json()) as PlaygroundSystemOneResponse;
    expect(body.answers).toEqual(answer.answers);
    expect(body.meta.provider).toBe("typesafe");
    expect(body.meta.latencyMs).toBe(25);
    expect(body.meta.costUsd).toBeCloseTo(1_000 * 0.042e-6, 12);
    expect(body.meta.notes).toEqual(["typesafe note"]);
    expect(seen[0]).toEqual(validBody as SystemOneRequest);
  });

  test("provider で経路を選べる", async () => {
    const response = await api()(post("/api/systemone", { ...validBody, provider: "gateway" }));
    const body = (await response?.json()) as PlaygroundSystemOneResponse;
    expect(body.meta.provider).toBe("gateway");
  });

  test("provider はプロバイダへ渡さない", async () => {
    const seen: SystemOneRequest[] = [];
    await api({ jev: { gateway: fakeJev("gateway", seen) } })(
      post("/api/systemone", { ...validBody, provider: "gateway" }),
    );
    expect(seen[0]).toEqual(validBody as SystemOneRequest);
  });

  test("JSON として読めなければ 400", async () => {
    const response = await api()(post("/api/systemone", "{not json"));
    expect(response?.status).toBe(400);
    const body = (await response?.json()) as ApiErrorBody;
    expect(body.error.code).toBe("invalid_request");
  });

  test("形が不正なら 400 と問題の一覧", async () => {
    const response = await api()(post("/api/systemone", { state: 1, questions: {} }));
    expect(response?.status).toBe(400);
    const body = (await response?.json()) as ApiErrorBody;
    expect(body.error.issues?.length).toBe(2);
  });

  test("キーの無い経路を選ぶと 503 と設定方法", async () => {
    const response = await api({ jev: { typesafe: fakeJev("typesafe") } })(
      post("/api/systemone", { ...validBody, provider: "gateway" }),
    );
    expect(response?.status).toBe(503);
    const body = (await response?.json()) as ApiErrorBody;
    expect(body.error.code).toBe("provider_unavailable");
    expect(body.error.message).toContain("AI_GATEWAY_API_KEY");
  });

  test("上流の 4xx はそのステータスで返す", async () => {
    const failing: JevProvider = {
      id: "typesafe",
      models: [],
      evaluate: () => errAsync(upstreamFailure(422, "bad question", { detail: "x" })),
    };
    const response = await api({ jev: { typesafe: failing } })(post("/api/systemone", validBody));
    expect(response?.status).toBe(422);
    const body = (await response?.json()) as ApiErrorBody;
    expect(body.error).toEqual({
      code: "upstream_error",
      message: "bad question",
      upstreamStatus: 422,
      details: { detail: "x" },
    });
  });

  test("上流の 5xx と接続失敗は 502 で返す", async () => {
    const failing: JevProvider = {
      id: "typesafe",
      models: [],
      evaluate: () => errAsync(upstreamFailure(529, "overloaded")),
    };
    const response = await api({ jev: { typesafe: failing } })(post("/api/systemone", validBody));
    expect(response?.status).toBe(502);
    const body = (await response?.json()) as ApiErrorBody;
    expect(body.error.upstreamStatus).toBe(529);
  });
});

describe("POST /api/llm/*", () => {
  test("evaluate は LLM の答えと費用を返す", async () => {
    const response = await api()(post("/api/llm/evaluate", { ...validBody, model: "openai/gpt-5.6-luna" }));
    expect(response?.status).toBe(200);
    const body = (await response?.json()) as LlmEvaluateResponse;
    expect(body.answers.urgent).toEqual({ type: "noul", noul: 0.7 });
    expect(body.meta).toMatchObject({ provider: "llm", costUsd: 0.001, latencyMs: 25 });
  });

  test("generate は生成した文章を返す", async () => {
    const response = await api()(post("/api/llm/generate", { model: "m/x", prompt: "hi" }));
    const body = (await response?.json()) as LlmGenerateResponse;
    expect(body.text).toBe("hello");
    expect(body.meta.costUsd).toBeNull();
  });

  test("Gateway のキーが無ければ 503", async () => {
    const response = await api({ llm: undefined })(post("/api/llm/generate", { model: "m/x", prompt: "hi" }));
    expect(response?.status).toBe(503);
  });
});

describe("ルーティング", () => {
  test("/api 以外は undefined を返して静的配信にまかせる", async () => {
    expect(await api()(new Request("http://localhost/"))).toBeUndefined();
  });

  test("未知の /api は 404", async () => {
    const response = await api()(new Request("http://localhost/api/nope"));
    expect(response?.status).toBe(404);
  });

  test("メソッド違いは 405", async () => {
    const response = await api()(new Request("http://localhost/api/systemone"));
    expect(response?.status).toBe(405);
  });
});

describe("ほかのサイトやほかの端末から使わせない", () => {
  const request = (headers: Record<string, string>, body: unknown = validBody) =>
    new Request("http://localhost:8765/api/systemone", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  test("同じオリジンからの呼び出しは通す", async () => {
    const response = await api()(request({ origin: "http://localhost:8765", host: "localhost:8765" }));
    expect(response?.status).toBe(200);
  });

  test("別のオリジンからの呼び出しは 403", async () => {
    const response = await api()(request({ origin: "https://evil.example", host: "localhost:8765" }));
    expect(response?.status).toBe(403);
  });

  test("Host がローカル以外（DNS リバインディング）なら 403", async () => {
    const response = await api()(request({ host: "evil.example:8765" }));
    expect(response?.status).toBe(403);
  });

  test("127.0.0.1 と [::1] はローカルとして扱う", async () => {
    for (const host of ["127.0.0.1:8765", "[::1]:8765"]) {
      const response = await api()(request({ host, origin: `http://${host}` }));
      expect(response?.status).toBe(200);
    }
  });

  test("POST の本文が JSON でなければ 415（プリフライトの無い送信を断る）", async () => {
    const response = await api()(
      new Request("http://localhost:8765/api/systemone", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify(validBody),
      }),
    );
    expect(response?.status).toBe(415);
  });
});
