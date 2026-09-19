// 右側の実験台。エディタ、実行ボタン、出力。

import type { CheckResult, Lesson } from "../lessons/types.ts";
import { currentModKey } from "../lib/platform.ts";
import type { RunRecord } from "../runner/record.ts";
import { Editor } from "./Editor.tsx";
import { Output } from "./Output.tsx";

export function Lab({
  lesson,
  code,
  editorKey,
  running,
  run,
  check,
  onChange,
  onRun,
  onStop,
  onReset,
}: {
  lesson: Lesson;
  code: string;
  editorKey: string;
  running: boolean;
  run: RunRecord | undefined;
  check: CheckResult | undefined;
  onChange: (code: string) => void;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const edited = code !== lesson.code;
  return (
    <section className="lab" aria-label="コードと実行結果">
      <div className="lab-toolbar">
        {running ? (
          <button type="button" className="button button-stop" onClick={onStop}>
            止める
          </button>
        ) : (
          <button type="button" className="button button-run" onClick={onRun}>
            実行
          </button>
        )}
        <button type="button" className="button button-quiet" onClick={onReset} disabled={!edited || running}>
          初期コードに戻す
        </button>
        <p className="lab-hint">
          <kbd>{currentModKey()}</kbd>
          <kbd>Enter</kbd> で実行。<kbd>Esc</kbd> の後 <kbd>Tab</kbd> でエディタから出られます
        </p>
      </div>
      <div className="lab-editor">
        <Editor key={editorKey} initial={code} onChange={onChange} onRun={onRun} label={`${lesson.title} のコード`} />
      </div>
      <div className="lab-output">
        <Output run={run} check={check} />
      </div>
    </section>
  );
}
