// 1 回の呼び出し（jev / llm.evaluate / llm.generate）の結果。答えの計器と、送受信した JSON。

import type { Questions } from "../../contract/jev.ts";
import { formatCost, formatMs, formatTokens, USD_JPY } from "../lib/format.ts";
import type { CallRecord } from "../runner/record.ts";
import { useI18n } from "./i18n.tsx";
import { AnswerReadout, summarizeAnswer } from "./Readouts.tsx";

function Json({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="json">
      <h5 className="json-title">{title}</h5>
      <pre className="json-body">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function Meta({ call }: { call: Extract<CallRecord, { status: "ok" }> }) {
  const { t } = useI18n();
  const { meta, usage, model } = call.response;
  const cost = formatCost(meta?.costUsd ?? null, USD_JPY);
  return (
    <p className="call-meta">
      <span className="call-model">{model}</span>
      {meta && <span>{t.providers[meta.provider]}</span>}
      {meta && <span className="num">{formatMs(meta.latencyMs)}</span>}
      <span>
        {t.input} <span className="num">{formatTokens(usage.input_tokens)}</span> / {t.output}{" "}
        <span className="num">{formatTokens(usage.output_tokens)}</span> {t.tokens}
      </span>
      <span>
        {cost ? (
          <>
            <span className="num">{cost.usd}</span>
            {t.approximately(<span className="num">{cost.jpy}</span>)}
          </>
        ) : (
          t.costUnknown
        )}
      </span>
    </p>
  );
}

export function CallCard({ call, collapsed }: { call: CallRecord; collapsed: boolean }) {
  const { t } = useI18n();
  const questions = ((call.request as { questions?: Questions } | undefined)?.questions ?? {}) as Questions;

  if (call.status === "pending") {
    return (
      <article className="call call-pending" aria-busy="true">
        <header className="call-head">
          <span className="call-kind">{t.kinds[call.kind]}</span>
          <span className="call-status">{t.calling}</span>
        </header>
      </article>
    );
  }

  if (call.status === "error") {
    return (
      <article className="call call-error">
        <header className="call-head">
          <span className="call-kind">{t.kinds[call.kind]}</span>
          <span className="call-status">
            {t.failed}
            {call.error.status ? ` (${call.error.status})` : ""}
          </span>
        </header>
        <p className="call-error-message">{call.error.message}</p>
        {call.error.issues && (
          <ul className="call-issues">
            {call.error.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <details className="call-json">
          <summary>{t.viewJson}</summary>
          <Json title={t.sentToServer} value={call.request} />
          {call.error.details !== undefined && <Json title={t.upstreamErrorBody} value={call.error.details} />}
        </details>
      </article>
    );
  }

  const { response } = call;
  const answers = "answers" in response ? response.answers : undefined;
  const { meta, ...withoutMeta } = response;

  const body = (
    <>
      {answers && (
        <div className="call-answers">
          {Object.entries(answers).map(([id, answer]) => (
            <AnswerReadout key={id} id={id} answer={answer} question={questions[id]} />
          ))}
        </div>
      )}
      {"text" in response && <blockquote className="call-text">{response.text}</blockquote>}
      {meta?.notes.map((note) => (
        <p key={note} className="call-note">
          {note}
        </p>
      ))}
      <details className="call-json">
        <summary>{t.viewJson}</summary>
        <Json title={t.sentToServerFromJev} value={call.request} />
        {meta && <Json title={t.sentUpstream(meta.upstream.url)} value={meta.upstream} />}
        <Json title={t.response} value={withoutMeta} />
      </details>
    </>
  );

  if (collapsed) {
    return (
      <details className="call call-ok call-collapsed">
        <summary className="call-head">
          <span className="call-kind">{t.kinds[call.kind]}</span>
          <span className="call-summary">
            {answers
              ? Object.entries(answers).map(([id, answer]) => (
                  <span key={id} className="call-summary-item">
                    <span className="call-summary-id">{id}</span> <span className="num">{summarizeAnswer(answer)}</span>
                  </span>
                ))
              : "text" in response && <span className="call-summary-item">{response.text.slice(0, 60)}</span>}
          </span>
          {meta && <span className="num call-summary-ms">{formatMs(meta.latencyMs)}</span>}
        </summary>
        <Meta call={call} />
        {body}
      </details>
    );
  }

  return (
    <article className="call call-ok">
      <header className="call-head">
        <span className="call-kind">{t.kinds[call.kind]}</span>
      </header>
      <Meta call={call} />
      {body}
    </article>
  );
}
