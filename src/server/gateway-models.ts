// Vercel AI Gateway の公開モデル一覧（認証不要）から、小型 LLM の単価を引く。

import { ResultAsync } from "neverthrow";
import type { LlmModelInfo } from "../contract/jev.ts";
import type { TokenPrice } from "../contract/pricing.ts";

export const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";

// 教材で比べる小型 LLM。AI SDK の Evaluation ドキュメントが LLM 評価アダプタの例に挙げている 3 つ。
export const CURATED_LLMS = [
  "openai/gpt-5.6-luna",
  "google/gemini-3.5-flash-lite",
  "anthropic/claude-haiku-4.5",
] as const;

// 一覧を取れないときの予備。2026-09-19 に GATEWAY_MODELS_URL で確認した値（1 トークンあたりの USD）。
const FALLBACK: Readonly<Record<string, { readonly name: string } & TokenPrice>> = {
  "openai/gpt-5.6-luna": { name: "GPT 5.6 Luna", inputPerToken: 0.0000002, outputPerToken: 0.0000012 },
  "google/gemini-3.5-flash-lite": {
    name: "Gemini 3.5 Flash Lite",
    inputPerToken: 0.0000003,
    outputPerToken: 0.0000025,
  },
  "anthropic/claude-haiku-4.5": { name: "Claude Haiku 4.5", inputPerToken: 0.000001, outputPerToken: 0.000005 },
};

interface ListedModel {
  readonly id: string;
  readonly name?: string;
  readonly pricing?: { readonly input?: string; readonly output?: string };
}

type Entry = { readonly name: string } & Partial<TokenPrice>;

function parseListing(body: unknown): ReadonlyMap<string, Entry> {
  const data = (body as { data?: unknown })?.data;
  if (!Array.isArray(data)) return new Map();
  return new Map(
    (data as ListedModel[]).map((model) => {
      const input = Number(model.pricing?.input);
      const output = Number(model.pricing?.output);
      const priced = model.pricing?.input !== undefined && Number.isFinite(input) && Number.isFinite(output);
      const entry: Entry = priced
        ? { name: model.name ?? model.id, inputPerToken: input, outputPerToken: output }
        : { name: model.name ?? model.id };
      return [model.id, entry];
    }),
  );
}

export interface ModelCatalog {
  price(modelId: string): Promise<TokenPrice | undefined>;
  curated(): Promise<LlmModelInfo[]>;
}

export function createModelCatalog(
  options: { readonly fetch?: typeof globalThis.fetch; readonly url?: string } = {},
): ModelCatalog {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const url = options.url ?? GATEWAY_MODELS_URL;
  let listing: Promise<ReadonlyMap<string, Entry>> | undefined;

  const load = () => {
    listing ??= ResultAsync.fromPromise(
      fetchImpl(url).then((response) => response.json()),
      () => undefined,
    ).match(parseListing, () => new Map<string, Entry>());
    return listing;
  };

  const lookup = async (modelId: string): Promise<({ readonly name: string } & TokenPrice) | undefined> => {
    const entry = (await load()).get(modelId);
    if (entry?.inputPerToken !== undefined && entry.outputPerToken !== undefined) {
      return { name: entry.name, inputPerToken: entry.inputPerToken, outputPerToken: entry.outputPerToken };
    }
    return FALLBACK[modelId];
  };

  return {
    async price(modelId) {
      const found = await lookup(modelId);
      return found ? { inputPerToken: found.inputPerToken, outputPerToken: found.outputPerToken } : undefined;
    },
    async curated() {
      const models = await Promise.all(
        CURATED_LLMS.map(async (id) => {
          const found = await lookup(id);
          return found ? [{ id, ...found }] : [];
        }),
      );
      return models.flat();
    },
  };
}
