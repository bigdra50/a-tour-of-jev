import { describe, expect, test } from "bun:test";
import type { SystemOneResponse } from "../../src/contract/jev.ts";
import { createTypeSafeProvider } from "../../src/server/providers/typesafe.ts";

const okBody: SystemOneResponse = {
  model: "jev-1.13.0",
  answers: { is_urgent: { type: "noul", noul: 0.92 } },
  usage: { input_tokens: 312, output_tokens: 48 },
};

type Captured = { url: string; init: RequestInit };

function stubFetch(responses: Array<() => Response>) {
  const calls: Captured[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra request");
    return next();
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const request = {
  state: "Help! My payouts have been failing for 3 days.",
  questions: { is_urgent: { type: "noul" as const, instructions: "Does this convey urgency?" } },
};

describe("createTypeSafeProvider", () => {
  test("公式 HTTP API の形で POST し、応答をそのまま返す", async () => {
    const { fetch, calls } = stubFetch([() => json(200, okBody)]);
    const provider = createTypeSafeProvider({ apiKey: "ts_secret", fetch });

    const result = (await provider.evaluate(request))._unsafeUnwrap();

    expect(calls).toHaveLength(1);
    const call = calls[0] as Captured;
    expect(call.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(call.init.method).toBe("POST");
    const headers = new Headers(call.init.headers);
    expect(headers.get("authorization")).toBe("Bearer ts_secret");
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(call.init.body))).toEqual({ model: "jev-latest", ...request });
    expect(result.response).toEqual(okBody);
  });

  test("model を指定するとそのまま送る", async () => {
    const { fetch, calls } = stubFetch([() => json(200, okBody)]);
    const provider = createTypeSafeProvider({ apiKey: "k", fetch });
    await provider.evaluate({ ...request, model: "jev-1.13.0" });
    expect(JSON.parse(String(calls[0]?.init.body)).model).toBe("jev-1.13.0");
  });

  test("学習用の trace にはキーを含めない", async () => {
    const { fetch } = stubFetch([() => json(200, okBody)]);
    const provider = createTypeSafeProvider({ apiKey: "ts_secret", fetch });
    const { upstream } = (await provider.evaluate(request))._unsafeUnwrap();
    expect(upstream.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(JSON.stringify(upstream)).not.toContain("ts_secret");
    expect(upstream.headers.Authorization).toBe("Bearer $TYPESAFE_API_KEY");
  });

  test("429 と 529 は待ってから再試行する", async () => {
    const waits: number[] = [];
    const { fetch, calls } = stubFetch([
      () => json(429, { message: "slow down" }, { "retry-after": "2" }),
      () => json(529, { message: "overloaded" }),
      () => json(200, okBody),
    ]);
    const provider = createTypeSafeProvider({
      apiKey: "k",
      fetch,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });

    const result = (await provider.evaluate(request))._unsafeUnwrap();

    expect(calls).toHaveLength(3);
    expect(waits[0]).toBe(2000);
    expect(waits[1]).toBeGreaterThan(0);
    expect(result.response.model).toBe("jev-1.13.0");
  });

  test("再試行しきれなければ最後のステータスで失敗する", async () => {
    const { fetch } = stubFetch([
      () => json(429, { message: "a" }),
      () => json(429, { message: "b" }),
      () => json(429, { message: "c" }),
    ]);
    const provider = createTypeSafeProvider({ apiKey: "k", fetch, sleep: async () => {} });
    const failure = (await provider.evaluate(request))._unsafeUnwrapErr();
    expect(failure.kind).toBe("upstream");
    expect(failure.status).toBe(429);
  });

  test("422 は再試行せず、上流の本文を details に残す", async () => {
    const detail = [{ loc: ["body", "questions", "x"], msg: "field required" }];
    const { fetch, calls } = stubFetch([() => json(422, { detail })]);
    const provider = createTypeSafeProvider({ apiKey: "k", fetch, sleep: async () => {} });
    const failure = (await provider.evaluate(request))._unsafeUnwrapErr();
    expect(calls).toHaveLength(1);
    expect(failure.status).toBe(422);
    expect(failure.details).toEqual({ detail });
    expect(failure.message.en).toContain("field required");
    expect(failure.message.ja).toContain("field required");
  });

  test("401 はキーの確認を促すメッセージにする", async () => {
    const { fetch } = stubFetch([() => json(401, { message: "Invalid API key" })]);
    const provider = createTypeSafeProvider({ apiKey: "k", fetch });
    const failure = (await provider.evaluate(request))._unsafeUnwrapErr();
    expect(failure.status).toBe(401);
    expect(failure.message.en).toContain("Invalid API key");
    expect(failure.message.ja).toContain("Invalid API key");
  });

  test("中断されたら 499 を返し、再試行しない", async () => {
    const controller = new AbortController();
    let count = 0;
    const fetch = (async () => {
      count++;
      controller.abort();
      throw new DOMException("aborted", "AbortError");
    }) as unknown as typeof globalThis.fetch;
    const provider = createTypeSafeProvider({ apiKey: "k", fetch, sleep: async () => {} });
    const failure = (await provider.evaluate(request, { signal: controller.signal }))._unsafeUnwrapErr();
    expect(failure.status).toBe(499);
    expect(count).toBe(1);
  });

  test("接続できなければ 502 として扱う", async () => {
    const fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof globalThis.fetch;
    const provider = createTypeSafeProvider({ apiKey: "k", fetch, sleep: async () => {} });
    const failure = (await provider.evaluate(request))._unsafeUnwrapErr();
    expect(failure.status).toBe(502);
  });

  test("answers の無い応答は 502 として扱う", async () => {
    const { fetch } = stubFetch([() => json(200, { hello: "world" })]);
    const provider = createTypeSafeProvider({ apiKey: "k", fetch });
    const failure = (await provider.evaluate(request))._unsafeUnwrapErr();
    expect(failure.status).toBe(502);
  });
});
