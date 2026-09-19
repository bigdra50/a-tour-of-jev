// 学習者のコードに渡すグローバル（jev, llm, noul, choice, score, print, show など）を組み立てる。
// 通信（transport）と出力（emit）を外から渡すので、Worker でもテストでも同じコードが動く。

import type { Result } from "neverthrow";
import type {
  LlmEvaluateResponse,
  LlmGenerateResponse,
  PlaygroundSystemOneResponse,
  ProviderId,
} from "../../contract/jev.ts";
import { choice, mean, noul, score, stdev } from "./helpers.ts";
import type { CallError, CallKind, CallResponse, RunEvent } from "./record.ts";

export interface RunSettings {
  /** 経路の既定値。null はキー未設定。 */
  readonly provider: ProviderId | null;
  /** jev() の model の既定値（provider が既定の経路のときだけ使う）。 */
  readonly model?: string;
  /** llm.evaluate / llm.generate の model の既定値。 */
  readonly llmModel: string;
}

export interface Transport {
  systemOne(body: unknown): Promise<Result<PlaygroundSystemOneResponse, CallError>>;
  llmEvaluate(body: unknown): Promise<Result<LlmEvaluateResponse, CallError>>;
  llmGenerate(body: unknown): Promise<Result<LlmGenerateResponse, CallError>>;
}

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);

/** postMessage で送れる形にする。関数や循環参照は文字列に置き換える。 */
export function toCloneable(value: unknown): unknown {
  // 祖先だけを覚える。同じオブジェクトを 2 か所から参照していても循環とはみなさない。
  const ancestors = new Set<object>();
  const walkObject = (v: object): unknown => {
    if (v instanceof Error) return { name: v.name, message: v.message };
    if (v instanceof Map) return Object.fromEntries([...v].map(([k, x]) => [String(k), walk(x)]));
    if (v instanceof Set) return [...v].map(walk);
    if (Array.isArray(v)) return v.map(walk);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
  };
  const walk = (v: unknown): unknown => {
    if (typeof v === "function") return `[関数 ${v.name || "anonymous"}]`;
    if (typeof v === "bigint") return `${v}n`;
    if (typeof v === "symbol") return v.toString();
    if (v === undefined || v === null || typeof v !== "object") return v;
    if (ancestors.has(v)) return "[循環参照]";
    ancestors.add(v);
    const result = walkObject(v);
    ancestors.delete(v);
    return result;
  };
  return walk(value);
}

/** print() の 1 行分の文字列。文字列はそのまま、それ以外は JSON。 */
export function formatForLog(values: readonly unknown[]): string {
  return values
    .map((v) => {
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean" || v === undefined || v === null) return String(v);
      return JSON.stringify(toCloneable(v), null, 2);
    })
    .join(" ");
}

/** 学習者のコードに投げる例外。公式 SDK と同じく、失敗した呼び出しは例外になる。 */
function callFailure(error: CallError): Error {
  return Object.assign(new Error(error.message), { name: "JevError", status: error.status, issues: error.issues });
}

export interface Runtime {
  /** 学習者のコードにグローバルとして渡すもの。 */
  readonly globals: Obj;
  /** 進行中の呼び出しがすべて終わるまで待つ。await し忘れた呼び出しの結果も出力に載せるため。 */
  whenIdle(): Promise<void>;
}

export function createRuntime(transport: Transport, emit: (event: RunEvent) => void, settings: RunSettings): Runtime {
  let nextId = 1;
  const inFlight = new Set<Promise<unknown>>();

  async function call<T extends CallResponse>(
    kind: CallKind,
    body: Obj,
    send: (body: unknown) => Promise<Result<T, CallError>>,
  ): Promise<T> {
    const id = nextId++;
    emit({ type: "call-start", id, kind, request: toCloneable(body) });
    const sending = send(body);
    inFlight.add(sending);
    const result = await sending.finally(() => inFlight.delete(sending));
    return result.match(
      (response) => {
        emit({ type: "call-end", id, ok: true, response });
        return response;
      },
      (error) => {
        emit({ type: "call-end", id, ok: false, error });
        throw callFailure(error);
      },
    );
  }

  function jev(request: unknown) {
    if (!isObject(request)) throw new TypeError("jev() には { state, questions } のオブジェクトを渡してください");
    const provider = (request.provider as ProviderId | undefined) ?? settings.provider ?? undefined;
    const model =
      (request.model as string | undefined) ?? (provider === settings.provider ? settings.model : undefined);
    const body = {
      ...request,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
    };
    return call("jev", body, (b) => transport.systemOne(b));
  }

  const llm = Object.freeze({
    evaluate(request: unknown) {
      if (!isObject(request)) throw new TypeError("llm.evaluate() には { state, questions } を渡してください");
      return call("llm-evaluate", { model: settings.llmModel, ...request }, (b) => transport.llmEvaluate(b));
    },
    generate(request: unknown) {
      if (!isObject(request)) throw new TypeError("llm.generate() には { prompt } を渡してください");
      return call("llm-generate", { model: settings.llmModel, ...request }, (b) => transport.llmGenerate(b));
    },
  });

  const print = (...values: unknown[]) => emit({ type: "log", level: "log", text: formatForLog(values) });
  const show = (value: unknown, label?: string) =>
    emit(
      label === undefined
        ? { type: "show", value: toCloneable(value) }
        : { type: "show", label, value: toCloneable(value) },
    );

  const console = Object.freeze({
    log: print,
    info: print,
    warn: (...values: unknown[]) => emit({ type: "log", level: "warn", text: formatForLog(values) }),
    error: (...values: unknown[]) => emit({ type: "log", level: "error", text: formatForLog(values) }),
  });

  return {
    globals: {
      jev,
      llm,
      noul,
      choice,
      score,
      print,
      show,
      console,
      mean,
      stdev,
      sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
      settings: Object.freeze({ ...settings }),
    },
    async whenIdle() {
      while (inFlight.size > 0) await Promise.allSettled([...inFlight]);
    },
  };
}
