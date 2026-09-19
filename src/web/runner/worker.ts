// 学習者のコードを実行する Web Worker。実行ごとに作り直し、終わったら親が terminate する。
// 無限ループや重い処理があっても画面が固まらないよう、メインスレッドとは分けている。

import { err, ok, type Result } from "neverthrow";
import { runUserCode } from "./execute.ts";
import type { CallError, RunEvent } from "./record.ts";
import { createRuntime, formatForLog, type RunSettings, type Transport, toCloneable } from "./scope.ts";

interface WorkerContext {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  addEventListener(type: "unhandledrejection", listener: (event: PromiseRejectionEvent) => void): void;
}

const context = self as unknown as WorkerContext;
const emit = (event: RunEvent) => context.postMessage(event);

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);

async function post<T>(path: string, body: unknown): Promise<Result<T, CallError>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return err({
      message: `この教材のサーバーに接続できません（${reason}）。bun run dev が動いているか確認してください`,
    });
  }
  const data: unknown = await response.json().catch(() => undefined);
  if (response.ok) return ok(data as T);
  const error = isObject(data) && isObject(data.error) ? data.error : {};
  return err({
    message: typeof error.message === "string" ? error.message : `HTTP ${response.status}`,
    status: typeof error.upstreamStatus === "number" ? error.upstreamStatus : response.status,
    ...(Array.isArray(error.issues) ? { issues: error.issues as string[] } : {}),
    ...(error.details !== undefined ? { details: error.details } : {}),
  });
}

const transport: Transport = {
  systemOne: (body) => post("/api/systemone", body),
  llmEvaluate: (body) => post("/api/llm/evaluate", body),
  llmGenerate: (body) => post("/api/llm/generate", body),
};

context.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  emit({
    type: "log",
    level: "error",
    text: `await していない処理が失敗しました: ${formatForLog([event.reason instanceof Error ? event.reason.message : event.reason])}`,
  });
});

context.addEventListener("message", async (event) => {
  const { code, settings } = event.data as { code: string; settings: RunSettings };
  const runtime = createRuntime(transport, emit, settings);
  const result = await runUserCode(code, runtime.globals);
  await runtime.whenIdle();
  emit(
    result.ok
      ? { type: "done", ok: true, value: toCloneable(result.value) }
      : { type: "done", ok: false, error: result.error },
  );
});
