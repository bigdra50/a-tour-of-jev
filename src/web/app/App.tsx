// 画面全体の状態をまとめる。レッスンの移動は URL の #/<id> で行う。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderId, StatusResponse } from "../../contract/jev.ts";
import { LANGS, type Lang } from "../../contract/lang.ts";
import { findLesson, LESSONS } from "../lessons/index.ts";
import type { Lesson, LessonId } from "../lessons/types.ts";
import { fetchStatus } from "../lib/api.ts";
import { addFinishedCalls, EMPTY_TOTALS, newlyFinished, type SessionTotals } from "../lib/session.ts";
import { load, save } from "../lib/storage.ts";
import { type RunHandle, startRun } from "../runner/controller.ts";
import type { RunRecord } from "../runner/record.ts";
import { Header, type HeaderSettings } from "./Header.tsx";
import { detectLang, I18nProvider, MESSAGES } from "./i18n.tsx";
import { Lab } from "./Lab.tsx";
import { LessonView } from "./LessonView.tsx";
import { SetupNotice } from "./SetupNotice.tsx";
import { Toc } from "./Toc.tsx";

const FIRST_LESSON = LESSONS[0] as Lesson;
const FALLBACK_LLM = "openai/gpt-5.6-luna";

interface StoredSettings {
  readonly provider?: ProviderId;
  readonly model?: string;
  readonly llmModel?: string;
}

/** 保存した言語があればそれを、なければブラウザの言語設定から決める。 */
function initialLang(): Lang {
  const stored = load<string>("lang", "");
  return LANGS.find((lang) => lang === stored) ?? detectLang(navigator.languages ?? [navigator.language]);
}

const lessonFromHash = (): Lesson | undefined =>
  findLesson(decodeURIComponent(window.location.hash.replace(/^#\/?/, "")));

const without = <T,>(record: Readonly<Record<string, T>>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

/** 保存された設定を、今のサーバーで使えるものに合わせる。 */
function effectiveSettings(stored: StoredSettings, status: StatusResponse | undefined): HeaderSettings {
  if (!status) return { provider: null, model: undefined, llmModel: stored.llmModel ?? FALLBACK_LLM };
  const provider =
    stored.provider && status.providers[stored.provider].configured ? stored.provider : status.defaultProvider;
  const models = provider ? status.jevModels[provider] : [];
  const model = stored.model && models.includes(stored.model) ? stored.model : models[0];
  const llmIds = status.llmModels.map((m) => m.id);
  const llmModel = stored.llmModel && llmIds.includes(stored.llmModel) ? stored.llmModel : (llmIds[0] ?? FALLBACK_LLM);
  return { provider, model, llmModel };
}

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [status, setStatus] = useState<StatusResponse>();
  const [statusError, setStatusError] = useState<string>();
  const [stored, setStored] = useState<StoredSettings>(() => load("settings", {}));
  const [done, setDone] = useState<ReadonlySet<LessonId>>(() => new Set(load<LessonId[]>("done", [])));
  const [codes, setCodes] = useState<Readonly<Record<string, string>>>(() => load("codes", {}));
  const [lesson, setLesson] = useState<Lesson>(
    () => lessonFromHash() ?? findLesson(load("current", FIRST_LESSON.id)) ?? FIRST_LESSON,
  );
  const [runs, setRuns] = useState<Readonly<Record<string, RunRecord>>>({});
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState<SessionTotals>(() => load("totals", EMPTY_TOTALS, "session"));
  const [tocOpen, setTocOpen] = useState(false);
  const [resets, setResets] = useState(0);
  const handle = useRef<RunHandle | null>(null);
  const lessonPane = useRef<HTMLElement>(null);

  const i18n = useMemo(() => ({ lang, t: MESSAGES[lang] }), [lang]);
  const settings = effectiveSettings(stored, status);
  const code = codes[lesson.id] ?? lesson.code[lang];
  const run = runs[lesson.id];
  const check = lesson.exercise && run && run.status !== "running" ? lesson.exercise.check(run) : undefined;

  // キーの出どころと注記はサーバーが言語ごとに返すので、言語を変えたら取り直す
  useEffect(() => {
    void fetchStatus(lang).match(setStatus, setStatusError);
  }, [lang]);

  useEffect(() => {
    save("lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => save("settings", stored), [stored]);
  useEffect(() => save("done", [...done]), [done]);
  useEffect(() => save("codes", codes), [codes]);
  useEffect(() => save("totals", totals, "session"), [totals]);

  // URL の #/<id> とレッスンを同期する
  useEffect(() => {
    const onHashChange = () => {
      const next = lessonFromHash();
      if (next) setLesson(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (lessonFromHash()?.id !== lesson.id) window.history.replaceState(null, "", `#/${lesson.id}`);
    save("current", lesson.id);
    lessonPane.current?.scrollTo({ top: 0 });
    // 別のレッスンに移ったら、走っている実行は止める
    handle.current?.stop();
  }, [lesson]);

  useEffect(() => {
    document.title = `${lesson.title[lang]} | A Tour of Jev`;
  }, [lesson, lang]);

  const runCode = useCallback(() => {
    if (handle.current) return;
    const target = lesson;
    let previous: RunRecord | undefined;
    const started = startRun(codes[target.id] ?? target.code[lang], settings, lang, (record) => {
      const finished = newlyFinished(previous, record);
      previous = record;
      if (finished.length > 0) setTotals((current) => addFinishedCalls(current, finished));
      setRuns((current) => ({ ...current, [target.id]: record }));
    });
    handle.current = started;
    setRunning(true);
    void started.done.then((record) => {
      handle.current = null;
      setRunning(false);
      const succeeded = record.status === "done" && record.calls.some((call) => call.status === "ok");
      const passed = target.exercise ? target.exercise.check(record).pass : succeeded;
      if (succeeded && passed) setDone((current) => new Set(current).add(target.id));
    });
  }, [lesson, codes, settings, lang]);

  const runRef = useRef(runCode);
  runRef.current = runCode;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".cm-editor")) return; // エディタの中はエディタのキー割り当てに任せる
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        runRef.current();
      } else if (event.key === "Escape") {
        if (handle.current) handle.current.stop();
        else setTocOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const changeCode = (next: string) =>
    setCodes((current) =>
      next === lesson.code[lang] ? without(current, lesson.id) : { ...current, [lesson.id]: next },
    );

  const resetCode = () => {
    setCodes((current) => without(current, lesson.id));
    setRuns((current) => without(current, lesson.id));
    setResets((n) => n + 1);
  };

  return (
    <I18nProvider value={i18n}>
      <div className="app" data-toc={tocOpen ? "open" : "closed"}>
        <Header
          status={status}
          settings={settings}
          totals={totals}
          tocOpen={tocOpen}
          onToggleToc={() => setTocOpen((open) => !open)}
          onChange={(next) => setStored((current) => ({ ...current, ...next }) as StoredSettings)}
          onLangChange={setLang}
        />
        <div className="workspace">
          <aside id="toc-panel" className="toc-panel">
            <Toc current={lesson.id} done={done} onNavigate={() => setTocOpen(false)} />
          </aside>
          <button
            type="button"
            className="toc-backdrop"
            aria-label={i18n.t.closeContents}
            onClick={() => setTocOpen(false)}
          />
          <main className="lesson-pane" ref={lessonPane}>
            <LessonView
              lesson={lesson}
              done={done.has(lesson.id)}
              check={check}
              llmAvailable={status?.llmAvailable ?? false}
            />
          </main>
          <div className="lab-pane">
            <SetupNotice status={status} error={statusError} />
            <Lab
              lesson={lesson}
              code={code}
              // 言語を変えたら、書き換えていないコードはその言語の初期コードに差し替える
              editorKey={`${lesson.id}:${lang}:${resets}`}
              running={running}
              run={run}
              check={check}
              onChange={changeCode}
              onRun={runCode}
              onStop={() => handle.current?.stop()}
              onReset={resetCode}
            />
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}
