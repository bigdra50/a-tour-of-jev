// 答えを計器のように見せる。Noul は 0〜1 の目盛りと針、Choice は選択肢ごとの確率、Score は定規と分布と期待値。

import type { Answer, ChoiceAnswer, EntryType, NoulAnswer, Question, ScoreAnswer } from "../../contract/jev.ts";
import { formatPercent, formatProbability } from "../lib/format.ts";
import { useI18n } from "./i18n.tsx";

type JsonObject = Exclude<EntryType, string | null | readonly unknown[]>;
const isJsonObject = (entry: EntryType): entry is JsonObject =>
  typeof entry === "object" && entry !== null && !Array.isArray(entry);

/** レベルや選択肢の説明を 1 行にする。{ what, ... } の形なら what を使う。 */
const describeEntry = (entry: EntryType | undefined): string => {
  if (entry === undefined || entry === null) return "";
  if (typeof entry === "string") return entry;
  if (isJsonObject(entry) && typeof entry.what === "string") return entry.what;
  return JSON.stringify(entry);
};

const TICKS = Array.from({ length: 11 }, (_, i) => i / 10);

function Scale({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <div className="scale" role="img" aria-label={label}>
      <div className="scale-track">
        <div className="scale-fill" style={{ width: `${clamped * 100}%` }} />
        {TICKS.map((t) => (
          <span
            key={t}
            className={t === 0.5 ? "scale-tick scale-tick-mid" : "scale-tick"}
            style={{ left: `${t * 100}%` }}
          />
        ))}
        <span className="scale-needle" style={{ left: `${clamped * 100}%` }} />
      </div>
      <div className="scale-labels" aria-hidden="true">
        <span>0</span>
        <span>0.5</span>
        <span>1</span>
      </div>
    </div>
  );
}

function Confidence({ value }: { value: number | undefined }) {
  const { t } = useI18n();
  if (value === undefined) {
    return <span className="confidence confidence-none">{t.noConfidence}</span>;
  }
  return (
    <span className="confidence" title={t.confidenceTitle}>
      <span className="confidence-label">confidence</span>
      <span className="confidence-meter" aria-hidden="true">
        <span style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }} />
      </span>
      <span className="num">{formatProbability(value)}</span>
    </span>
  );
}

function NoulReadout({ answer }: { answer: NoulAnswer }) {
  const { t } = useI18n();
  return (
    <div className="readout-body readout-noul">
      <p className="readout-figure">
        <span className="num readout-big">{formatProbability(answer.noul)}</span>
        <span className="readout-caption">
          {t.probabilityOfYes} ({formatPercent(answer.noul)})
        </span>
      </p>
      <Scale value={answer.noul} label={`${t.probabilityOfYes} ${formatProbability(answer.noul)}`} />
    </div>
  );
}

function ChoiceReadout({ answer, question }: { answer: ChoiceAnswer; question: Question | undefined }) {
  const { t } = useI18n();
  const criteria = question?.type === "choice" ? question.criteria : undefined;
  const probabilities = answer.probabilities;
  const rows = probabilities
    ? Object.entries(probabilities).sort(([, a], [, b]) => b - a)
    : Object.keys(criteria ?? { [answer.choice]: null }).map((option) => [option, undefined] as const);

  return (
    <div className="readout-body readout-choice">
      <div className="readout-row">
        <p className="readout-figure">
          <span className="readout-choice-name">{answer.choice}</span>
          {probabilities?.[answer.choice] !== undefined && (
            <span className="readout-caption">
              {t.probability} {formatProbability(probabilities[answer.choice] ?? 0)}
            </span>
          )}
        </p>
        <Confidence value={answer.confidence} />
      </div>
      <ul className="bars">
        {rows.map(([option, p]) => (
          <li key={option} className={option === answer.choice ? "bar bar-chosen" : "bar"}>
            <span className="bar-name" title={describeEntry(criteria?.[option])}>
              {option}
            </span>
            {p === undefined ? (
              <span className="bar-empty">{option === answer.choice ? t.chosen : ""}</span>
            ) : (
              <>
                <span className="bar-track" aria-hidden="true">
                  <span className="bar-fill" style={{ width: `${p * 100}%` }} />
                </span>
                <span className="num bar-value">{formatProbability(p)}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {!probabilities && <p className="readout-note">{t.noDistribution}</p>}
    </div>
  );
}

function ScoreReadout({ answer, question }: { answer: ScoreAnswer; question: Question | undefined }) {
  const { t } = useI18n();
  const levels =
    question?.type === "score"
      ? question.criteria
      : Object.keys(answer.legend ?? answer.probabilities ?? {}).map((k) => answer.legend?.[k] ?? k);
  const count = Math.max(levels.length, 2);
  const top = count - 1;
  const position = (level: number) => (top === 0 ? 0 : (level / top) * 100);
  const probabilities = answer.probabilities;
  const maxP = probabilities ? Math.max(...Object.values(probabilities), 0.0001) : 1;

  return (
    <div className="readout-body readout-score">
      <div className="readout-row">
        <p className="readout-figure">
          <span className="num readout-big">{answer.score.toFixed(2)}</span>
          <span className="readout-caption">{t.positionOnScale(top)}</span>
        </p>
        <Confidence value={answer.confidence} />
      </div>
      <div className="ruler" role="img" aria-label={`score ${answer.score.toFixed(2)}（0〜${top}）`}>
        <div className="ruler-bars">
          {probabilities &&
            Array.from({ length: count }, (_, level) => {
              const p = probabilities[String(level)] ?? 0;
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: レベルは順番そのものが番号
                  key={level}
                  className="ruler-bar"
                  style={{ left: `${position(level)}%`, height: `${(p / maxP) * 100}%` }}
                  title={`${t.level(String(level))}: ${formatProbability(p)}`}
                >
                  <span className="num ruler-bar-value">{formatProbability(p)}</span>
                </span>
              );
            })}
        </div>
        <div className="ruler-axis">
          {Array.from({ length: count }, (_, level) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: レベルは順番そのものが番号
            <span key={level} className="ruler-tick" style={{ left: `${position(level)}%` }} />
          ))}
          <span className="ruler-marker" style={{ left: `${position(Math.min(Math.max(answer.score, 0), top))}%` }} />
        </div>
      </div>
      <ol className="legend" start={0}>
        {levels.map((level, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: レベルは順番そのものが番号
          <li key={index} className={Math.round(answer.score) === index ? "legend-item legend-near" : "legend-item"}>
            <span className="num legend-index">{index}</span>
            <span className="legend-text">{describeEntry(level)}</span>
          </li>
        ))}
      </ol>
      {!probabilities && <p className="readout-note">{t.noDistribution}</p>}
    </div>
  );
}

const TYPE_LABEL: Readonly<Record<Answer["type"], string>> = { noul: "Noul", choice: "Choice", score: "Score" };

export function AnswerReadout({
  id,
  answer,
  question,
}: {
  id: string;
  answer: Answer;
  question: Question | undefined;
}) {
  return (
    <section className={`readout readout-${answer.type}`} aria-label={`${id}（${TYPE_LABEL[answer.type]}）`}>
      <header className="readout-head">
        <h4 className="readout-id">{id}</h4>
        <span className="readout-type">{TYPE_LABEL[answer.type]}</span>
      </header>
      {question?.instructions !== undefined && question.instructions !== null && (
        <p className="readout-question">{describeEntry(question.instructions as EntryType)}</p>
      )}
      {answer.type === "noul" && <NoulReadout answer={answer} />}
      {answer.type === "choice" && <ChoiceReadout answer={answer} question={question} />}
      {answer.type === "score" && <ScoreReadout answer={answer} question={question} />}
    </section>
  );
}

/** 折りたたみ表示用の 1 行の要約。 */
export function summarizeAnswer(answer: Answer): string {
  switch (answer.type) {
    case "noul":
      return formatProbability(answer.noul);
    case "choice":
      return answer.confidence === undefined
        ? answer.choice
        : `${answer.choice} (${formatProbability(answer.confidence)})`;
    case "score":
      return answer.score.toFixed(2);
  }
}
