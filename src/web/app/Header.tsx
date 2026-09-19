// 画面上部。題字、経路とモデルと言語の選択、このセッションの累計。

import type { ProviderId, StatusResponse } from "../../contract/jev.ts";
import { LANGS, type Lang } from "../../contract/lang.ts";
import { formatCost, formatTokens, USD_JPY } from "../lib/format.ts";
import type { SessionTotals } from "../lib/session.ts";
import { LANG_NAMES, useI18n } from "./i18n.tsx";

export interface HeaderSettings {
  readonly provider: ProviderId | null;
  readonly model: string | undefined;
  readonly llmModel: string;
}

export function Header({
  status,
  settings,
  totals,
  tocOpen,
  onToggleToc,
  onChange,
  onLangChange,
}: {
  status: StatusResponse | undefined;
  settings: HeaderSettings;
  totals: SessionTotals;
  tocOpen: boolean;
  onToggleToc: () => void;
  onChange: (next: Partial<HeaderSettings>) => void;
  onLangChange: (lang: Lang) => void;
}) {
  const { lang, t } = useI18n();
  const cost = formatCost(totals.costUsd, USD_JPY);
  const models = settings.provider && status ? status.jevModels[settings.provider] : [];

  return (
    <header className="masthead">
      <div className="masthead-brand">
        <button
          type="button"
          className="toc-toggle"
          aria-expanded={tocOpen}
          aria-controls="toc-panel"
          onClick={onToggleToc}
        >
          {t.contents}
        </button>
        <a className="wordmark" href="#/hello">
          <span className="wordmark-tour">A Tour of</span> <span className="wordmark-jev">Jev</span>
        </a>
      </div>

      <div className="masthead-controls">
        <label className="control">
          <span className="control-label">{t.route}</span>
          <select
            value={settings.provider ?? ""}
            disabled={!status}
            onChange={(e) => onChange({ provider: e.target.value as ProviderId, model: undefined })}
          >
            {!settings.provider && <option value="">{t.noApiKey}</option>}
            {(["typesafe", "gateway"] as const).map((id) => (
              <option key={id} value={id} disabled={!status?.providers[id].configured}>
                {t.providers[id]}
                {status?.providers[id].configured ? "" : t.noApiKeySuffix}
              </option>
            ))}
          </select>
        </label>
        <label className="control">
          <span className="control-label">{t.model}</span>
          <select
            value={settings.model ?? models[0] ?? ""}
            disabled={models.length === 0}
            onChange={(e) => onChange({ model: e.target.value })}
          >
            {models.length === 0 && <option value="">{t.noModels}</option>}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        {status?.llmAvailable && (
          <label className="control">
            <span className="control-label">{t.comparisonLlm}</span>
            <select value={settings.llmModel} onChange={(e) => onChange({ llmModel: e.target.value })}>
              {status.llmModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="control">
          <span className="control-label">{t.language}</span>
          <select value={lang} onChange={(e) => onLangChange(e.target.value as Lang)}>
            {LANGS.map((id) => (
              <option key={id} value={id} lang={id}>
                {LANG_NAMES[id]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="session" title={t.totalsTitle}>
        <div>
          <dt>{t.calls}</dt>
          <dd>
            <span className="num">{totals.calls}</span> {t.callsUnit}
          </dd>
        </div>
        <div>
          <dt>{t.input}</dt>
          <dd>
            <span className="num">{formatTokens(totals.inputTokens)}</span> {t.tokens}
          </dd>
        </div>
        <div>
          <dt>{t.cost}</dt>
          <dd>
            <span className="num">{cost?.usd}</span>
            {totals.unknownCost && "+"}
            {cost && t.approximately(<span className="num">{cost.jpy}</span>)}
          </dd>
        </div>
      </dl>
    </header>
  );
}
