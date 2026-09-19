// /api/* のハンドラ。上流の呼び出しはプロバイダに任せ、ここでは検証・経路選択・計測・エラー整形だけを行う。

import { ResultAsync } from "neverthrow";
import type {
  ApiErrorBody,
  CallMeta,
  LlmEvaluateResponse,
  LlmGenerateResponse,
  LlmModelInfo,
  PlaygroundSystemOneResponse,
  ProviderId,
  ProviderStatus,
  StatusResponse,
} from "../contract/jev.ts";
import { type Lang, type Localized, parseLang, pick } from "../contract/lang.ts";
import { jevCostUsd } from "../contract/pricing.ts";
import {
  type Validation,
  validateLlmEvaluateRequest,
  validateLlmGenerateRequest,
  validateSystemOneRequest,
} from "../contract/validate.ts";
import { type Credentials, maskKey, type ResolvedKey } from "./credentials.ts";
import type { UpstreamFailure } from "./providers/errors.ts";
import { GATEWAY_JEV_MODEL } from "./providers/gateway.ts";
import type { LlmProvider } from "./providers/llm.ts";
import type { JevProvider } from "./providers/types.ts";
import { TYPESAFE_MODELS } from "./providers/typesafe.ts";

export interface ApiDeps {
  readonly credentials: Credentials;
  readonly jev: Readonly<Partial<Record<ProviderId, JevProvider>>>;
  readonly llm?: LlmProvider;
  readonly llmModels: () => Promise<readonly LlmModelInfo[]>;
  /** ミリ秒の単調時計。テストで差し替える。 */
  readonly now?: () => number;
}

type ApiError = ApiErrorBody["error"];
/** lang はリクエストの Accept-Language から決めた、説明文の言語。 */
type Handler = (request: Request, lang: Lang) => Promise<Response>;

const DEFAULT_MODELS: Readonly<Record<ProviderId, readonly string[]>> = {
  typesafe: TYPESAFE_MODELS,
  gateway: [GATEWAY_JEV_MODEL],
};

const MISSING_KEY_MESSAGE: Readonly<Record<ProviderId, Localized>> = {
  typesafe: {
    ja: "TypeSafe API の経路は API キーが未設定です。TYPESAFE_API_KEY を環境変数か .env.local に設定して、サーバーを再起動してください",
    en: "The TypeSafe API route has no API key. Set TYPESAFE_API_KEY in your environment or .env.local, then restart the server",
  },
  gateway: {
    ja: "Vercel AI Gateway の経路は API キーが未設定です。AI_GATEWAY_API_KEY（vck_ で始まるキー）を環境変数か .env.local に設定して、サーバーを再起動してください",
    en: "The Vercel AI Gateway route has no API key. Set AI_GATEWAY_API_KEY (a key that starts with vck_) in your environment or .env.local, then restart the server",
  },
};
const NO_PROVIDER_MESSAGE: Localized = {
  ja: "Jev を呼べる API キーがありません。TYPESAFE_API_KEY か AI_GATEWAY_API_KEY を環境変数か .env.local に設定して、サーバーを再起動してください",
  en: "There is no API key that can call Jev. Set TYPESAFE_API_KEY or AI_GATEWAY_API_KEY in your environment or .env.local, then restart the server",
};
const NO_LLM_MESSAGE: Localized = {
  ja: "LLM 連携には Vercel AI Gateway のキー（AI_GATEWAY_API_KEY、vck_ で始まる）が必要です。設定してサーバーを再起動してください",
  en: "Using an LLM requires a Vercel AI Gateway key (AI_GATEWAY_API_KEY, which starts with vck_). Set it and restart the server",
};

const json = (status: number, body: unknown) => Response.json(body, { status });
const apiError = (status: number, error: ApiError) => json(status, { error } satisfies ApiErrorBody);

function fromUpstream(failure: UpstreamFailure, lang: Lang): Response {
  // 上流の 4xx（キー不正・入力不正・レート制限）は学習者が直せるのでそのまま返す。5xx と接続失敗は 502 にまとめる。
  const status = failure.status >= 400 && failure.status < 500 ? failure.status : 502;
  return apiError(status, {
    code: "upstream_error",
    message: failure.message[lang],
    upstreamStatus: failure.status,
    ...(failure.details !== undefined ? { details: failure.details } : {}),
  });
}

function providerStatus(configured: boolean, key: ResolvedKey | undefined, lang: Lang): ProviderStatus {
  if (!configured) return { configured: false };
  return key ? { configured, from: key.from[lang], masked: maskKey(key.key) } : { configured };
}

// このサーバーは API キーを持って上流を代理で呼ぶ。自分のブラウザの、このページからの呼び出しだけを通す。
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const hostnameOf = (host: string): string =>
  host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : (host.split(":")[0] ?? host);

function rejectForeign(request: Request, lang: Lang): Response | undefined {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  // Host を見るのは DNS リバインディング（外部のドメイン名を 127.0.0.1 に向ける手口）を防ぐため
  if (!LOCAL_HOSTNAMES.has(hostnameOf(host))) {
    return apiError(403, {
      code: "forbidden",
      message: pick(
        { ja: "この API は localhost からだけ呼べます", en: "This API can only be called from localhost" },
        lang,
      ),
    });
  }
  const origin = request.headers.get("origin");
  if (origin !== null && (!URL.canParse(origin) || new URL(origin).host !== host)) {
    return apiError(403, {
      code: "forbidden",
      message: pick({ ja: "ほかのサイトからは呼べません", en: "Calls from other sites are not allowed" }, lang),
    });
  }
  // JSON 以外の POST はブラウザのプリフライト（事前確認）なしで送れてしまうので断る
  if (request.method === "POST" && !request.headers.get("content-type")?.includes("application/json")) {
    return apiError(415, {
      code: "invalid_request",
      message: pick({ ja: "本文は application/json で送ってください", en: "Send the body as application/json" }, lang),
    });
  }
  return undefined;
}

type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly response: Response };

async function parseBody<T>(
  request: Request,
  lang: Lang,
  validate: (body: unknown) => Validation<T>,
): Promise<Parsed<T>> {
  const body = await ResultAsync.fromPromise(request.json(), () => undefined);
  if (body.isErr()) {
    return {
      ok: false,
      response: apiError(400, {
        code: "invalid_request",
        message: pick({ ja: "リクエスト本文が JSON として読めません", en: "The request body is not valid JSON" }, lang),
      }),
    };
  }
  const validation = validate(body.value);
  if (!validation.ok) {
    return {
      ok: false,
      response: apiError(400, {
        code: "invalid_request",
        message: pick(
          { ja: "リクエストの形が正しくありません", en: "The request does not have the right shape" },
          lang,
        ),
        issues: validation.issues.map((issue) => issue[lang]),
      }),
    };
  }
  return { ok: true, value: validation.value };
}

export function createApi(deps: ApiDeps): (request: Request) => Promise<Response | undefined> {
  const now = deps.now ?? (() => performance.now());
  const defaultProvider: ProviderId | null = deps.jev.typesafe ? "typesafe" : deps.jev.gateway ? "gateway" : null;

  const timed = async <T, E>(run: () => ResultAsync<T, E>) => {
    const start = now();
    const result = await run();
    return { result, latencyMs: Math.round(now() - start) };
  };

  const status: Handler = async (_, lang) => {
    const llmModels = deps.llm ? await deps.llmModels() : [];
    const body: StatusResponse = {
      providers: {
        typesafe: providerStatus(Boolean(deps.jev.typesafe), deps.credentials.typesafe, lang),
        gateway: providerStatus(Boolean(deps.jev.gateway), deps.credentials.gateway, lang),
      },
      defaultProvider,
      llmAvailable: Boolean(deps.llm),
      jevModels: {
        typesafe: deps.jev.typesafe?.models ?? DEFAULT_MODELS.typesafe,
        gateway: deps.jev.gateway?.models ?? DEFAULT_MODELS.gateway,
      },
      llmModels,
      notes: deps.credentials.notes.map((note) => note[lang]),
    };
    return json(200, body);
  };

  const systemOne: Handler = async (request, lang) => {
    const parsed = await parseBody(request, lang, validateSystemOneRequest);
    if (!parsed.ok) return parsed.response;
    const { provider: requested, ...jevRequest } = parsed.value;

    const providerId = requested ?? defaultProvider;
    const provider = providerId ? deps.jev[providerId] : undefined;
    if (!providerId || !provider) {
      return apiError(503, {
        code: "provider_unavailable",
        message: (providerId ? MISSING_KEY_MESSAGE[providerId] : NO_PROVIDER_MESSAGE)[lang],
      });
    }

    const { result, latencyMs } = await timed(() => provider.evaluate(jevRequest, { signal: request.signal }));
    return result.match(
      ({ response, upstream, notes }) => {
        const meta: CallMeta = {
          provider: providerId,
          latencyMs,
          costUsd: jevCostUsd(response.usage),
          upstream,
          notes: notes.map((note) => note[lang]),
        };
        return json(200, { ...response, meta } satisfies PlaygroundSystemOneResponse);
      },
      (failure) => fromUpstream(failure, lang),
    );
  };

  const llmEvaluate: Handler = async (request, lang) => {
    const parsed = await parseBody(request, lang, validateLlmEvaluateRequest);
    if (!parsed.ok) return parsed.response;
    const { llm } = deps;
    if (!llm) return apiError(503, { code: "provider_unavailable", message: NO_LLM_MESSAGE[lang] });
    const { result, latencyMs } = await timed(() => llm.evaluate(parsed.value, { signal: request.signal }));
    return result.match(
      ({ response, upstream, costUsd }) => {
        const meta: CallMeta = { provider: "llm", latencyMs, costUsd, upstream, notes: [] };
        return json(200, { ...response, meta } satisfies LlmEvaluateResponse);
      },
      (failure) => fromUpstream(failure, lang),
    );
  };

  const llmGenerate: Handler = async (request, lang) => {
    const parsed = await parseBody(request, lang, validateLlmGenerateRequest);
    if (!parsed.ok) return parsed.response;
    const { llm } = deps;
    if (!llm) return apiError(503, { code: "provider_unavailable", message: NO_LLM_MESSAGE[lang] });
    const { result, latencyMs } = await timed(() => llm.generate(parsed.value, { signal: request.signal }));
    return result.match(
      ({ model, text, usage, upstream, costUsd }) => {
        const meta: CallMeta = { provider: "llm", latencyMs, costUsd, upstream, notes: [] };
        return json(200, { model, text, usage, meta } satisfies LlmGenerateResponse);
      },
      (failure) => fromUpstream(failure, lang),
    );
  };

  const routes: Readonly<Record<string, Readonly<Record<string, Handler>>>> = {
    "/api/status": { GET: status },
    "/api/systemone": { POST: systemOne },
    "/api/llm/evaluate": { POST: llmEvaluate },
    "/api/llm/generate": { POST: llmGenerate },
  };

  return async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname !== "/api" && !pathname.startsWith("/api/")) return undefined;
    const lang = parseLang(request.headers.get("accept-language"));
    const rejected = rejectForeign(request, lang);
    if (rejected) return rejected;
    const route = routes[pathname];
    if (!route) {
      return apiError(404, {
        code: "invalid_request",
        message: pick({ ja: `${pathname} という API はありません`, en: `There is no API called ${pathname}` }, lang),
      });
    }
    const handler = route[request.method];
    if (!handler) {
      const methods = Object.keys(route).join(", ");
      return apiError(405, {
        code: "invalid_request",
        message: pick(
          { ja: `${pathname} は ${methods} で呼んでください`, en: `Call ${pathname} with ${methods}` },
          lang,
        ),
      });
    }
    try {
      return await handler(request, lang);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return apiError(500, {
        code: "internal",
        message: pick({ ja: `サーバー内部のエラー: ${message}`, en: `Internal server error: ${message}` }, lang),
      });
    }
  };
}
