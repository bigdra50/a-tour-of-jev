// 右側の実験台。エディタ、実行ボタン、出力。

import type { CheckResult, Lesson } from "../lessons/types.ts";
import { currentModKey } from "../lib/platform.ts";
import type { RunRecord } from "../runner/record.ts";
import { Editor } from "./Editor.tsx";
import { useI18n } from "./i18n.tsx";
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
  const { lang, t } = useI18n();
  const edited = code !== lesson.code[lang];
  return (
    <section className="lab" aria-label={t.lab}>
      <div className="lab-toolbar">
        {running ? (
          <button type="button" className="button button-stop" onClick={onStop}>
            {t.stop}
          </button>
        ) : (
          <button type="button" className="button button-run" onClick={onRun}>
            {t.run}
          </button>
        )}
        <button type="button" className="button button-quiet" onClick={onReset} disabled={!edited || running}>
          {t.resetCode}
        </button>
        <p className="lab-hint">{t.keyboardHint(currentModKey())}</p>
      </div>
      <div className="lab-editor">
        <Editor key={editorKey} initial={code} onChange={onChange} onRun={onRun} label={t.codeOf(lesson.title[lang])} />
      </div>
      <div className="lab-output">
        <Output run={run} check={check} />
      </div>
    </section>
  );
}
