// 画面上部。題字、経路とモデルの選択、このセッションの累計。

import type { ProviderId, StatusResponse } from "../../contract/jev.ts";
import { formatCost, formatTokens } from "../lib/format.ts";
import type { SessionTotals } from "../lib/session.ts";
import { USD_JPY } from "./CallCard.tsx";

const PROVIDER_LABEL: Readonly<Record<ProviderId, string>> = {
  typesafe: "TypeSafe 直",
  gateway: "Vercel AI Gateway",
};

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
}: {
  status: StatusResponse | undefined;
  settings: HeaderSettings;
  totals: SessionTotals;
  tocOpen: boolean;
  onToggleToc: () => void;
  onChange: (next: Partial<HeaderSettings>) => void;
}) {
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
          目次
        </button>
        <a className="wordmark" href="#/hello">
          <span className="wordmark-tour">A Tour of</span> <span className="wordmark-jev">Jev</span>
        </a>
      </div>

      <div className="masthead-controls">
        <label className="control">
          <span className="control-label">経路</span>
          <select
            value={settings.provider ?? ""}
            disabled={!status}
            onChange={(e) => onChange({ provider: e.target.value as ProviderId, model: undefined })}
          >
            {!settings.provider && <option value="">キー未設定</option>}
            {(["typesafe", "gateway"] as const).map((id) => (
              <option key={id} value={id} disabled={!status?.providers[id].configured}>
                {PROVIDER_LABEL[id]}
                {status?.providers[id].configured ? "" : "（キー未設定）"}
              </option>
            ))}
          </select>
        </label>
        <label className="control">
          <span className="control-label">モデル</span>
          <select
            value={settings.model ?? models[0] ?? ""}
            disabled={models.length === 0}
            onChange={(e) => onChange({ model: e.target.value })}
          >
            {models.length === 0 && <option value="">なし</option>}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        {status?.llmAvailable && (
          <label className="control">
            <span className="control-label">比べる LLM</span>
            <select value={settings.llmModel} onChange={(e) => onChange({ llmModel: e.target.value })}>
              {status.llmModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <dl className="session" title={`このブラウザのタブを開いてからの累計。円は 1 ドル = ${USD_JPY} 円の概算`}>
        <div>
          <dt>呼び出し</dt>
          <dd>
            <span className="num">{totals.calls}</span> 回
          </dd>
        </div>
        <div>
          <dt>入力</dt>
          <dd>
            <span className="num">{formatTokens(totals.inputTokens)}</span> トークン
          </dd>
        </div>
        <div>
          <dt>費用</dt>
          <dd>
            <span className="num">{cost?.usd}</span>
            {totals.unknownCost && "+"}（約 <span className="num">{cost?.jpy}</span>）
          </dd>
        </div>
      </dl>
    </header>
  );
}
