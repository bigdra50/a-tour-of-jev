import { describe, expect, test } from "bun:test";
import { CURATED_LLMS, createModelCatalog } from "../../src/server/gateway-models.ts";

const listing = {
  data: [
    {
      id: "openai/gpt-5.6-luna",
      name: "GPT 5.6 Luna",
      type: "language",
      pricing: { input: "0.0000002", output: "0.0000012" },
    },
    { id: "typesafe-ai/jev", name: "Jev", type: "evaluation", pricing: { input: "0.000000042", output: "0" } },
    { id: "google/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", type: "language", pricing: {} },
  ],
};

const fetchReturning = (body: unknown, counter = { n: 0 }) =>
  (async () => {
    counter.n++;
    return Response.json(body);
  }) as unknown as typeof globalThis.fetch;

describe("createModelCatalog", () => {
  test("公開モデル一覧から 1 トークンあたりの単価を読む", async () => {
    const catalog = createModelCatalog({ fetch: fetchReturning(listing) });
    expect(await catalog.price("openai/gpt-5.6-luna")).toEqual({
      inputPerToken: 0.0000002,
      outputPerToken: 0.0000012,
    });
  });

  test("単価の載っていないモデルは組み込みの値に頼る", async () => {
    const catalog = createModelCatalog({ fetch: fetchReturning(listing) });
    const price = await catalog.price("google/gemini-3.5-flash-lite");
    expect(price?.inputPerToken).toBeGreaterThan(0);
  });

  test("一覧に無く組み込みにも無いモデルは undefined", async () => {
    const catalog = createModelCatalog({ fetch: fetchReturning(listing) });
    expect(await catalog.price("someone/unknown")).toBeUndefined();
  });

  test("取得に失敗しても組み込みの単価で答える", async () => {
    const failing = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof globalThis.fetch;
    const catalog = createModelCatalog({ fetch: failing });
    expect((await catalog.price("openai/gpt-5.6-luna"))?.outputPerToken).toBeGreaterThan(0);
  });

  test("一覧の取得は 1 回だけ", async () => {
    const counter = { n: 0 };
    const catalog = createModelCatalog({ fetch: fetchReturning(listing, counter) });
    await Promise.all([catalog.price("openai/gpt-5.6-luna"), catalog.curated(), catalog.price("x/y")]);
    expect(counter.n).toBe(1);
  });

  test("curated は教材で使う小型 LLM を名前と単価つきで返す", async () => {
    const catalog = createModelCatalog({ fetch: fetchReturning(listing) });
    const models = await catalog.curated();
    expect(models.map((m) => m.id)).toEqual([...CURATED_LLMS]);
    expect(models[0]).toEqual({
      id: "openai/gpt-5.6-luna",
      name: "GPT 5.6 Luna",
      inputPerToken: 0.0000002,
      outputPerToken: 0.0000012,
    });
  });
});
