// 1 回の呼び出し（jev / llm.evaluate / llm.generate）の結果。答えの計器と、送受信した JSON。

import type { Questions } from "../../contract/jev.ts";
import { formatCost, formatMs, formatTokens } from "../lib/format.ts";
import type { CallRecord } from "../runner/record.ts";
import { AnswerReadout, summarizeAnswer } from "./Readouts.tsx";

export const USD_JPY = 150;

const KIND_LABEL: Readonly<Record<CallRecord["kind"], string>> = {
  jev: "Jev",
  "llm-evaluate": "LLM で評価",
  "llm-generate": "LLM で生成",
};

const PROVIDER_LABEL: Readonly<Record<string, string>> = {
  typesafe: "TypeSafe 直",
  gateway: "Vercel AI Gateway",
  llm: "Vercel AI Gateway",
};

function Json({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="json">
      <h5 className="json-title">{title}</h5>
      <pre className="json-body">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function Meta({ call }: { call: Extract<CallRecord, { status: "ok" }> }) {
  const { meta, usage, model } = call.response;
  const cost = formatCost(meta?.costUsd ?? null, USD_JPY);
  return (
    <p className="call-meta">
      <span className="call-model">{model}</span>
      {meta && <span>{PROVIDER_LABEL[meta.provider] ?? meta.provider}</span>}
      {meta && <span className="num">{formatMs(meta.latencyMs)}</span>}
      <span>
        入力 <span className="num">{formatTokens(usage.input_tokens)}</span> / 出力{" "}
        <span className="num">{formatTokens(usage.output_tokens)}</span> トークン
      </span>
      <span>
        {cost ? (
          <>
            <span className="num">{cost.usd}</span>（約 <span className="num">{cost.jpy}</span>）
          </>
        ) : (
          "費用 不明"
        )}
      </span>
    </p>
  );
}

export function CallCard({ call, collapsed }: { call: CallRecord; collapsed: boolean }) {
  const questions = ((call.request as { questions?: Questions } | undefined)?.questions ?? {}) as Questions;

  if (call.status === "pending") {
    return (
      <article className="call call-pending" aria-busy="true">
        <header className="call-head">
          <span className="call-kind">{KIND_LABEL[call.kind]}</span>
          <span className="call-status">呼び出し中…</span>
        </header>
      </article>
    );
  }

  if (call.status === "error") {
    return (
      <article className="call call-error">
        <header className="call-head">
          <span className="call-kind">{KIND_LABEL[call.kind]}</span>
          <span className="call-status">失敗{call.error.status ? `（${call.error.status}）` : ""}</span>
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
          <summary>JSON を見る</summary>
          <Json title="サーバーに送った内容" value={call.request} />
          {call.error.details !== undefined && <Json title="上流のエラー本文" value={call.error.details} />}
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
        <summary>JSON を見る</summary>
        <Json title="サーバーに送った内容（jev() の引数）" value={call.request} />
        {meta && <Json title={`上流に送った内容（${meta.upstream.url}）`} value={meta.upstream} />}
        <Json title="応答" value={withoutMeta} />
      </details>
    </>
  );

  if (collapsed) {
    return (
      <details className="call call-ok call-collapsed">
        <summary className="call-head">
          <span className="call-kind">{KIND_LABEL[call.kind]}</span>
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
        <span className="call-kind">{KIND_LABEL[call.kind]}</span>
      </header>
      <Meta call={call} />
      {body}
    </article>
  );
}
