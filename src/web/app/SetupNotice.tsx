// API キーが無いとき・サーバーに届かないときの案内。

import type { StatusResponse } from "../../contract/jev.ts";
import { useI18n } from "./i18n.tsx";

export function SetupNotice({ status, error }: { status: StatusResponse | undefined; error: string | undefined }) {
  const { t } = useI18n();
  if (error) {
    return (
      <section className="notice notice-error" role="alert">
        <h2 className="notice-title">{t.serverUnreachable}</h2>
        <p>{error}</p>
        <p>{t.serverUnreachableHelp}</p>
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
          <h2 className="notice-title">{t.noKeysTitle}</h2>
          <ol>
            {t.noKeysSteps.map((step, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 手順は固定の並びで、並べ替えもしない
              <li key={index}>{step}</li>
            ))}
          </ol>
          <p>{t.noKeysNote}</p>
        </>
      )}
      {status.notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </section>
  );
}
