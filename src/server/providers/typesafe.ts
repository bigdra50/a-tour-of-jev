// TypeSafe の HTTP API を直接呼ぶ経路。
// 公式 SDK を使わず fetch で書くのは、送った JSON をそのまま学習者に見せるため。

import { err, ok, type Result, ResultAsync } from "neverthrow";
import type { SystemOneRequest, SystemOneResponse, UpstreamTrace } from "../../contract/jev.ts";
import { abortedFailure, extractErrorMessage, type UpstreamFailure, upstreamFailure } from "./errors.ts";
import type { JevProvider, JevProviderResult } from "./types.ts";

export const TYPESAFE_BASE_URL = "https://api.typesafe.ai";
export const TYPESAFE_DEFAULT_MODEL = "jev-latest";
// GET /v1/models はエイリアスしか返さないが、バージョン付き ID も model に指定できる（docs.typesafe.ai/models）。
export const TYPESAFE_MODELS: readonly string[] = ["jev-latest", "jev-preview", "jev-1.13.0"];

// 429（レート制限）と 529（過負荷）は時間をおけば通る。公式 SDK と同じく再試行する。
const RETRYABLE_STATUSES = new Set([429, 503, 529]);
const BASE_BACKOFF_MS = 500;
const MAX_RETRY_AFTER_MS = 10_000;

export interface TypeSafeProviderOptions {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly fetch?: typeof globalThis.fetch;
  /** 再試行の回数（初回を含まない）。 */
  readonly maxRetries?: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function retryDelayMs(response: Response | undefined, attempt: number): number {
  const header = response?.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_AFTER_MS);
  }
  return BASE_BACKOFF_MS * 2 ** attempt;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describeStatus(status: number, body: unknown): string {
  const detail = extractErrorMessage(body);
  const hint =
    status === 401
      ? "（API キーを確認してください）"
      : status === 429
        ? "（レート制限。少し待ってから再実行してください）"
        : "";
  return `TypeSafe API が ${status} を返しました${detail ? `: ${detail}` : ""}${hint}`;
}

type Attempt =
  | { readonly kind: "done"; readonly result: Result<SystemOneResponse, UpstreamFailure> }
  | { readonly kind: "retry"; readonly failure: UpstreamFailure; readonly response?: Response };

async function attemptOnce(fetchImpl: typeof globalThis.fetch, url: string, init: RequestInit): Promise<Attempt> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    if (init.signal?.aborted) return { kind: "done", result: err(abortedFailure()) };
    const reason = error instanceof Error ? error.message : String(error);
    return { kind: "retry", failure: upstreamFailure(502, `TypeSafe API に接続できませんでした: ${reason}`) };
  }

  const body = await readBody(response);
  if (response.ok) {
    if (typeof body !== "object" || body === null || !("answers" in body)) {
      return {
        kind: "done",
        result: err(upstreamFailure(502, "TypeSafe API の応答に answers がありません", body)),
      };
    }
    return { kind: "done", result: ok(body as SystemOneResponse) };
  }

  const failure = upstreamFailure(response.status, describeStatus(response.status, body), body);
  return RETRYABLE_STATUSES.has(response.status)
    ? { kind: "retry", failure, response }
    : { kind: "done", result: err(failure) };
}

export function createTypeSafeProvider(options: TypeSafeProviderOptions): JevProvider {
  const baseURL = (options.baseURL ?? TYPESAFE_BASE_URL).replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const maxRetries = options.maxRetries ?? 2;
  const sleep = options.sleep ?? defaultSleep;
  const url = `${baseURL}/v1/systemone`;

  async function evaluate(
    request: SystemOneRequest,
    signal: AbortSignal | undefined,
  ): Promise<Result<JevProviderResult, UpstreamFailure>> {
    const body = {
      model: request.model ?? TYPESAFE_DEFAULT_MODEL,
      state: request.state,
      questions: request.questions,
    };
    const init: RequestInit = {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    };
    const upstream: UpstreamTrace = {
      method: "POST",
      url,
      headers: { Authorization: "Bearer $TYPESAFE_API_KEY", "Content-Type": "application/json" },
      body,
    };

    let failure = upstreamFailure(502, "TypeSafe API の呼び出しに失敗しました");
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const outcome = await attemptOnce(fetchImpl, url, init);
      if (outcome.kind === "done") return outcome.result.map((response) => ({ response, upstream, notes: [] }));
      failure = outcome.failure;
      if (attempt < maxRetries) await sleep(retryDelayMs(outcome.response, attempt));
    }
    return err(failure);
  }

  return {
    id: "typesafe",
    models: TYPESAFE_MODELS,
    evaluate: (request, { signal } = {}) => new ResultAsync(evaluate(request, signal)),
  };
}
