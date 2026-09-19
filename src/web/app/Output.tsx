// 実行結果。ログ・show()・呼び出しを起きた順に並べ、最後にエラーや戻り値、課題の判定を出す。

import type { CheckResult } from "../lessons/types.ts";
import { currentModKey } from "../lib/platform.ts";
import type { RunItem, RunRecord } from "../runner/record.ts";
import { CallCard } from "./CallCard.tsx";
import { useI18n } from "./i18n.tsx";
import { ValueView } from "./ValueView.tsx";

// 呼び出しがこれより多い実行は、1 件ずつを 1 行に畳んで表示する
const COLLAPSE_AFTER = 3;

export function Output({ run, check }: { run: RunRecord | undefined; check: CheckResult | undefined }) {
  const { lang, t } = useI18n();
  if (!run) {
    return (
      <div className="output output-empty">
        <p>{t.outputEmpty}</p>
        <p className="output-hint">{t.outputEmptyHint(currentModKey())}</p>
      </div>
    );
  }

  const collapsed = run.calls.length > COLLAPSE_AFTER;
  const callsById = new Map(run.calls.map((call) => [call.id, call]));

  // 出力は追記されるだけで順番が変わらないので、位置をキーにしてよい
  const renderItem = (item: RunItem, index: number): React.ReactNode => {
    switch (item.type) {
      case "log":
        return (
          <pre key={`log-${index}`} className={`log log-${item.level}`}>
            {item.text}
          </pre>
        );
      case "show":
        return <ValueView key={`show-${index}`} value={item.value} label={item.label} />;
      case "call": {
        const call = callsById.get(item.id);
        return call ? <CallCard key={`call-${item.id}`} call={call} collapsed={collapsed} /> : null;
      }
    }
  };

  return (
    <div className="output" aria-live="polite">
      {run.items.map(renderItem)}

      {run.status === "running" && <p className="run-status">{t.running}</p>}

      {run.status === "failed" && run.error && (
        <div className="run-error" role="alert">
          <p className="run-error-title">
            {run.error.kind === "syntax" ? t.syntaxError : t.runtimeError}
            {run.error.line !== undefined && t.atLine(run.error.line)}
          </p>
          <pre className="run-error-message">{run.error.message}</pre>
        </div>
      )}

      {run.status === "stopped" && (
        <p className="run-stopped" role="status">
          {run.stopReason === "timeout" ? t.stoppedByTimeout : t.stoppedByUser}
        </p>
      )}

      {run.status === "done" && run.returned !== undefined && <ValueView value={run.returned} label={t.returnValue} />}

      {run.status === "done" && run.items.length === 0 && run.returned === undefined && (
        <p className="run-status">{t.noOutput}</p>
      )}

      {check && run.status !== "running" && (
        <p className={check.pass ? "check check-pass" : "check check-fail"} role="status">
          <span className="check-label">{check.pass ? t.exerciseCleared : t.exercise}</span>
          {check.message[lang]}
        </p>
      )}
    </div>
  );
}
