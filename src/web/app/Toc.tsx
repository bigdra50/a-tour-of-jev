import { LESSONS, PARTS } from "../lessons/index.ts";
import type { LessonId } from "../lessons/types.ts";
import { useI18n } from "./i18n.tsx";

export function Toc({
  current,
  done,
  onNavigate,
}: {
  current: LessonId;
  done: ReadonlySet<LessonId>;
  onNavigate: () => void;
}) {
  const { lang, t } = useI18n();
  const numbered = LESSONS.filter((lesson) => lesson.part !== "free");
  const completed = numbered.filter((lesson) => done.has(lesson.id)).length;

  return (
    <nav className="toc" aria-label={t.contents}>
      <p className="toc-progress">
        <span className="num">{completed}</span> / <span className="num">{numbered.length}</span> {t.progressDone}
        <span className="toc-progress-bar" aria-hidden="true">
          <span style={{ width: `${(completed / numbered.length) * 100}%` }} />
        </span>
      </p>
      {PARTS.map((part) => (
        <section key={part.id} className="toc-part">
          <h2 className="toc-part-title">{part.title[lang]}</h2>
          <ol className="toc-list">
            {LESSONS.filter((lesson) => lesson.part === part.id).map((lesson) => {
              const number = numbered.findIndex((l) => l.id === lesson.id) + 1;
              return (
                <li key={lesson.id}>
                  <a
                    href={`#/${lesson.id}`}
                    className="toc-link"
                    aria-current={lesson.id === current ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span className="num toc-number">{number > 0 ? number : ""}</span>
                    <span className="toc-title">{lesson.title[lang]}</span>
                    {done.has(lesson.id) && (
                      <span className="toc-check" role="img" aria-label={t.completed}>
                        ✓
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </nav>
  );
}
