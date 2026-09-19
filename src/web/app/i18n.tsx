// 画面の文言。日本語と英語の両方を同じ Messages 型で書くので、片方にしかない文言は型検査で落ちる。
// <kbd> や <code> を含む文は、語順が言語で変わるので部品ごと言語別に書く。

import { createContext, type ReactNode, useContext } from "react";
import type { ProviderId } from "../../contract/jev.ts";
import { type Lang, parseLang } from "../../contract/lang.ts";
import { USD_JPY } from "../lib/format.ts";
import type { CallKind } from "../runner/record.ts";

export interface Messages {
  readonly contents: string;
  readonly closeContents: string;
  readonly language: string;
  readonly route: string;
  readonly model: string;
  readonly comparisonLlm: string;
  readonly providers: Readonly<Record<ProviderId | "llm", string>>;
  readonly noApiKey: string;
  readonly noApiKeySuffix: string;
  readonly noModels: string;
  readonly totalsTitle: string;
  readonly calls: string;
  readonly callsUnit: string;
  readonly input: string;
  readonly output: string;
  readonly tokens: string;
  readonly cost: string;
  readonly costUnknown: string;
  /** 費用に添える円の概算。英語の画面ではドルだけにするので何も出さない。 */
  readonly approximately: (yen: ReactNode) => ReactNode;

  readonly progressDone: string;
  readonly completed: string;
  readonly lessonCompletedTitle: string;
  readonly requiresLlm: ReactNode;
  readonly exercise: string;
  readonly cleared: string;
  readonly exerciseCleared: string;
  readonly hint: string;
  readonly officialDocs: string;
  readonly pager: string;
  readonly previousLesson: string;
  readonly nextLesson: string;

  readonly lab: string;
  readonly run: string;
  readonly stop: string;
  readonly resetCode: string;
  readonly keyboardHint: (mod: string) => ReactNode;
  readonly codeOf: (title: string) => string;

  readonly outputEmpty: string;
  readonly outputEmptyHint: (mod: string) => ReactNode;
  readonly running: string;
  readonly syntaxError: string;
  readonly runtimeError: string;
  readonly atLine: (line: number) => string;
  readonly stoppedByTimeout: string;
  readonly stoppedByUser: string;
  readonly returnValue: string;
  readonly noOutput: string;

  readonly kinds: Readonly<Record<CallKind, string>>;
  readonly calling: string;
  readonly failed: string;
  readonly viewJson: string;
  readonly sentToServer: string;
  readonly sentToServerFromJev: string;
  readonly upstreamErrorBody: string;
  readonly sentUpstream: (url: string) => string;
  readonly response: string;

  readonly noConfidence: string;
  readonly confidenceTitle: string;
  readonly probabilityOfYes: string;
  readonly probability: string;
  readonly chosen: string;
  readonly noDistribution: string;
  readonly positionOnScale: (top: number) => string;
  readonly level: (level: string) => string;

  readonly serverUnreachable: string;
  readonly serverUnreachableHelp: ReactNode;
  readonly noKeysTitle: string;
  readonly noKeysSteps: readonly ReactNode[];
  readonly noKeysNote: string;
}

const ja: Messages = {
  contents: "目次",
  closeContents: "目次を閉じる",
  language: "言語",
  route: "経路",
  model: "モデル",
  comparisonLlm: "比べる LLM",
  providers: { typesafe: "TypeSafe API", gateway: "Vercel AI Gateway", llm: "Vercel AI Gateway" },
  noApiKey: "キー未設定",
  noApiKeySuffix: "（キー未設定）",
  noModels: "なし",
  totalsTitle: `このブラウザのタブを開いてからの累計。円は 1 ドル = ${USD_JPY} 円の概算`,
  calls: "呼び出し",
  callsUnit: "回",
  input: "入力",
  output: "出力",
  tokens: "トークン",
  cost: "費用",
  costUnknown: "費用 不明",
  approximately: (yen) => <>（約 {yen}）</>,

  progressDone: "完了",
  completed: "完了",
  lessonCompletedTitle: "このレッスンは完了しています",
  requiresLlm: (
    <>
      このレッスンの LLM の部分には Vercel AI Gateway のキー（<code>AI_GATEWAY_API_KEY</code>）が必要です。
      キーが無いまま実行すると、LLM の呼び出しがエラーになります。
    </>
  ),
  exercise: "課題",
  cleared: "クリア",
  exerciseCleared: "課題クリア",
  hint: "ヒント",
  officialDocs: "公式ドキュメント",
  pager: "前後のレッスン",
  previousLesson: "前のレッスン",
  nextLesson: "次のレッスン",

  lab: "コードと実行結果",
  run: "実行",
  stop: "止める",
  resetCode: "初期コードに戻す",
  keyboardHint: (mod) => (
    <>
      <kbd>{mod}</kbd>
      <kbd>Enter</kbd> で実行。<kbd>Esc</kbd> の後 <kbd>Tab</kbd> でエディタから出られます
    </>
  ),
  codeOf: (title) => `${title} のコード`,

  outputEmpty: "実行すると、ここに答えが並びます。",
  outputEmptyHint: (mod) => (
    <>
      <kbd>{mod}</kbd>
      <kbd>Enter</kbd> でも実行できます。
    </>
  ),
  running: "実行中…",
  syntaxError: "構文エラー",
  runtimeError: "実行時エラー",
  atLine: (line) => `（${line} 行目）`,
  stoppedByTimeout: "2 分を超えたので止めました。",
  stoppedByUser: "実行を止めました。",
  returnValue: "戻り値",
  noOutput: "何も出力せずに終わりました。print() や show() で値を出してみましょう。",

  kinds: { jev: "Jev", "llm-evaluate": "LLM で評価", "llm-generate": "LLM で生成" },
  calling: "呼び出し中…",
  failed: "失敗",
  viewJson: "JSON を見る",
  sentToServer: "サーバーに送った内容",
  sentToServerFromJev: "サーバーに送った内容（jev() の引数）",
  upstreamErrorBody: "上流のエラー本文",
  sentUpstream: (url) => `上流に送った内容（${url}）`,
  response: "応答",

  noConfidence: "confidence なし",
  confidenceTitle: "確率の分布がどれだけ 1 か所に集中しているか（0〜1）",
  probabilityOfYes: "yes である確率",
  probability: "確率",
  chosen: "選択",
  noDistribution: "この答えには確率の分布がありません（LLM による評価）",
  positionOnScale: (top) => `0〜${top} のうちの位置`,
  level: (level) => `レベル ${level}`,

  serverUnreachable: "この教材のサーバーに届きません",
  serverUnreachableHelp: (
    <>
      ターミナルで <code>bun run dev</code> が動いているか確認して、このページを再読み込みしてください。
    </>
  ),
  noKeysTitle: "API キーが設定されていません",
  noKeysSteps: [
    <>
      <code>cp .env.example .env.local</code> を実行する
    </>,
    <>
      <code>.env.local</code> に <code>TYPESAFE_API_KEY</code> か <code>AI_GATEWAY_API_KEY</code>（<code>vck_</code>{" "}
      で始まる）を書く
    </>,
    <>
      サーバーを止めて <code>bun run dev</code> で起動し直す
    </>,
  ],
  noKeysNote: "シェルで export した環境変数も読みます。キーはサーバーの中だけで使い、ブラウザには送りません。",
};

const en: Messages = {
  contents: "Contents",
  closeContents: "Close contents",
  language: "Language",
  route: "Route",
  model: "Model",
  comparisonLlm: "Comparison LLM",
  providers: { typesafe: "TypeSafe API", gateway: "Vercel AI Gateway", llm: "Vercel AI Gateway" },
  noApiKey: "No API key",
  noApiKeySuffix: " (no API key)",
  noModels: "None",
  totalsTitle: "Totals since this browser tab was opened",
  calls: "Calls",
  callsUnit: "",
  input: "Input",
  output: "output",
  tokens: "tokens",
  cost: "Cost",
  costUnknown: "cost unknown",
  approximately: () => null,

  progressDone: "done",
  completed: "Done",
  lessonCompletedTitle: "You have completed this lesson",
  requiresLlm: (
    <>
      The LLM parts of this lesson need a Vercel AI Gateway key (<code>AI_GATEWAY_API_KEY</code>). Without it, the LLM
      calls fail.
    </>
  ),
  exercise: "Exercise",
  cleared: "Cleared",
  exerciseCleared: "Exercise cleared",
  hint: "Hint",
  officialDocs: "Official docs",
  pager: "Previous and next lessons",
  previousLesson: "Previous lesson",
  nextLesson: "Next lesson",

  lab: "Code and results",
  run: "Run",
  stop: "Stop",
  resetCode: "Reset code",
  keyboardHint: (mod) => (
    <>
      <kbd>{mod}</kbd>
      <kbd>Enter</kbd> to run. Press <kbd>Esc</kbd>, then <kbd>Tab</kbd> to leave the editor
    </>
  ),
  codeOf: (title) => `Code for ${title}`,

  outputEmpty: "Run the code to see the answers here.",
  outputEmptyHint: (mod) => (
    <>
      You can also press <kbd>{mod}</kbd>
      <kbd>Enter</kbd>.
    </>
  ),
  running: "Running…",
  syntaxError: "Syntax error",
  runtimeError: "Runtime error",
  atLine: (line) => ` (line ${line})`,
  stoppedByTimeout: "Stopped after running for more than 2 minutes.",
  stoppedByUser: "Stopped.",
  returnValue: "Return value",
  noOutput: "Finished without any output. Try printing values with print() or show().",

  kinds: { jev: "Jev", "llm-evaluate": "LLM evaluation", "llm-generate": "LLM generation" },
  calling: "Calling…",
  failed: "Failed",
  viewJson: "View JSON",
  sentToServer: "Sent to the server",
  sentToServerFromJev: "Sent to the server (the jev() argument)",
  upstreamErrorBody: "Upstream error body",
  sentUpstream: (url) => `Sent upstream (${url})`,
  response: "Response",

  noConfidence: "no confidence",
  confidenceTitle: "How concentrated the probability distribution is (0 to 1)",
  probabilityOfYes: "probability of yes",
  probability: "probability",
  chosen: "chosen",
  noDistribution: "This answer has no probability distribution (evaluated by an LLM)",
  positionOnScale: (top) => `position from 0 to ${top}`,
  level: (level) => `level ${level}`,

  serverUnreachable: "Cannot reach this tutorial's server",
  serverUnreachableHelp: (
    <>
      Check that <code>bun run dev</code> is running in your terminal, then reload this page.
    </>
  ),
  noKeysTitle: "No API key is set",
  noKeysSteps: [
    <>
      Run <code>cp .env.example .env.local</code>
    </>,
    <>
      Put <code>TYPESAFE_API_KEY</code> or <code>AI_GATEWAY_API_KEY</code> (it starts with <code>vck_</code>) in{" "}
      <code>.env.local</code>
    </>,
    <>
      Stop the server and start it again with <code>bun run dev</code>
    </>,
  ],
  noKeysNote:
    "Environment variables exported in your shell are read too. Keys stay inside the server and are never sent to the browser.",
};

export const MESSAGES: Readonly<Record<Lang, Messages>> = { ja, en };

/** 言語の選択肢は、その言語自身の名前で出す。 */
export const LANG_NAMES: Readonly<Record<Lang, string>> = { ja: "日本語", en: "English" };

/** ブラウザの言語設定の先頭から、最初に表示する言語を決める。 */
export const detectLang = (languages: readonly string[]): Lang => parseLang(languages[0]);

const I18nContext = createContext<{ readonly lang: Lang; readonly t: Messages }>({ lang: "en", t: en });

export const I18nProvider = I18nContext.Provider;

export const useI18n = () => useContext(I18nContext);
