// メインスレッド側。Worker を起動してイベントを実行記録にまとめ、時間切れと停止を扱う。

import { emptyRun, type RunEvent, type RunRecord, reduceRun } from "./record.ts";
import type { RunSettings } from "./scope.ts";

export const WORKER_URL = "/runner-worker.js";
// 並列で数十回呼ぶレッスンでも収まり、無限ループはきちんと止まる長さ。
const DEFAULT_TIMEOUT_MS = 120_000;

export interface RunHandle {
  stop(): void;
  readonly done: Promise<RunRecord>;
}

export function startRun(
  code: string,
  settings: RunSettings,
  onUpdate: (run: RunRecord) => void,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): RunHandle {
  const worker = new Worker(WORKER_URL, { type: "module" });
  let record = emptyRun();
  let finished = false;
  let resolveDone: (run: RunRecord) => void = () => {};
  const done = new Promise<RunRecord>((resolve) => {
    resolveDone = resolve;
  });

  const apply = (event: RunEvent) => {
    if (finished) return;
    record = reduceRun(record, event);
    onUpdate(record);
    if (event.type === "done" || event.type === "stopped") {
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      resolveDone(record);
    }
  };

  const timer = setTimeout(() => apply({ type: "stopped", reason: "timeout" }), timeoutMs);
  worker.onmessage = (event: MessageEvent<RunEvent>) => apply(event.data);
  worker.onerror = (event) => {
    event.preventDefault();
    apply({
      type: "done",
      ok: false,
      error: { kind: "runtime", message: event.message || "実行環境でエラーが起きました" },
    });
  };
  onUpdate(record);
  worker.postMessage({ code, settings });

  return { stop: () => apply({ type: "stopped", reason: "user" }), done };
}
