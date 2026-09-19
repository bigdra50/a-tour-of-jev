// 左側の本文。部の名前、題、要約、本文、課題、公式ドキュメントへのリンク、前後の移動。

import { useMemo } from "react";
import { LESSONS, neighbors, PARTS } from "../lessons/index.ts";
import type { CheckResult, Lesson } from "../lessons/types.ts";
import { renderMarkdown } from "../lib/markdown.ts";

function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  // 本文はこのリポジトリの教材データ（信頼できる入力）だけを描画する
  // biome-ignore lint/security/noDangerouslySetInnerHtml: 教材データ以外は渡さない
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function LessonView({
  lesson,
  done,
  check,
  llmAvailable,
}: {
  lesson: Lesson;
  done: boolean;
  check: CheckResult | undefined;
  llmAvailable: boolean;
}) {
  const part = PARTS.find((p) => p.id === lesson.part);
  const numbered = LESSONS.filter((l) => l.part !== "free");
  const index = numbered.findIndex((l) => l.id === lesson.id);
  const { previous, next } = neighbors(lesson.id);

  return (
    <article className="lesson" aria-labelledby="lesson-title">
      <p className="lesson-part">
        {part?.title}
        {index >= 0 && (
          <span className="lesson-count">
            {index + 1} / {numbered.length}
          </span>
        )}
      </p>
      <h1 id="lesson-title" className="lesson-title">
        {lesson.title}
        {done && (
          <span className="lesson-done" title="このレッスンは完了しています">
            完了
          </span>
        )}
      </h1>
      <p className="lesson-lead">{lesson.lead}</p>

      {lesson.requires === "llm" && !llmAvailable && (
        <p className="lesson-requires" role="note">
          このレッスンの LLM の部分には Vercel AI Gateway のキー（<code>AI_GATEWAY_API_KEY</code>）が必要です。
          キーが無いまま実行すると、LLM の呼び出しがエラーになります。
        </p>
      )}

      <Markdown source={lesson.body} className="prose" />

      {lesson.exercise && (
        <section className={check?.pass ? "exercise exercise-pass" : "exercise"} aria-labelledby="exercise-title">
          <h2 id="exercise-title" className="exercise-title">
            課題
            {check?.pass && <span className="exercise-state">クリア</span>}
          </h2>
          <Markdown source={lesson.exercise.goal} className="prose exercise-goal" />
          {lesson.exercise.hint && (
            <details className="exercise-hint">
              <summary>ヒント</summary>
              <Markdown source={lesson.exercise.hint} className="prose" />
            </details>
          )}
          {check && !check.pass && <p className="exercise-feedback">{check.message}</p>}
        </section>
      )}

      <section className="docs" aria-labelledby="docs-title">
        <h2 id="docs-title" className="docs-title">
          公式ドキュメント
        </h2>
        <ul>
          {lesson.docs.map((doc) => (
            <li key={doc.url}>
              <a href={doc.url} target="_blank" rel="noreferrer">
                {doc.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <nav className="pager" aria-label="前後のレッスン">
        {previous ? (
          <a className="pager-link pager-previous" href={`#/${previous.id}`}>
            <span className="pager-label">前のレッスン</span>
            <span className="pager-title">{previous.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a className="pager-link pager-next" href={`#/${next.id}`}>
            <span className="pager-label">次のレッスン</span>
            <span className="pager-title">{next.title}</span>
          </a>
        )}
      </nav>
    </article>
  );
}
