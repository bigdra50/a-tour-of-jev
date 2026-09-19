// API キーが無いとき・サーバーに届かないときの案内。

import type { StatusResponse } from "../../contract/jev.ts";

export function SetupNotice({ status, error }: { status: StatusResponse | undefined; error: string | undefined }) {
  if (error) {
    return (
      <section className="notice notice-error" role="alert">
        <h2 className="notice-title">この教材のサーバーに届きません</h2>
        <p>{error}</p>
        <p>
          ターミナルで <code>bun run dev</code> が動いているか確認して、このページを再読み込みしてください。
        </p>
      </section>
    );
  }
  if (!status) return null;

  const noKeys = !status.providers.typesafe.configured && !status.providers.gateway.configured;
  if (!noKeys && status.notes.length === 0) return null;

  return (
    <section className={noKeys ? "notice notice-error" : "notice"} role={noKeys ? "alert" : "note"}>
      {noKeys && (
        <>
          <h2 className="notice-title">API キーが設定されていません</h2>
          <ol>
            <li>
              <code>cp .env.example .env.local</code> を実行する
            </li>
            <li>
              <code>.env.local</code> に <code>TYPESAFE_API_KEY</code> か <code>AI_GATEWAY_API_KEY</code>（
              <code>vck_</code> で始まる）を書く
            </li>
            <li>
              サーバーを止めて <code>bun run dev</code> で起動し直す
            </li>
          </ol>
          <p>シェルで export した環境変数も読みます。キーはサーバーの中だけで使い、ブラウザには送りません。</p>
        </>
      )}
      {status.notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </section>
  );
}
