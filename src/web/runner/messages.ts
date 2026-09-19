// 実行環境（Worker）から学習者に見せる文。画面の辞書（app/i18n.tsx）は React を読み込むので、Worker からは使わない。

import type { Lang } from "../../contract/lang.ts";

export interface RunnerMessages {
  readonly jevArgument: string;
  readonly llmEvaluateArgument: string;
  readonly llmGenerateArgument: string;
  readonly serverUnreachable: (reason: string) => string;
  readonly unhandledRejection: (detail: string) => string;
  readonly workerCrashed: string;
}

export const RUNNER_MESSAGES: Readonly<Record<Lang, RunnerMessages>> = {
  ja: {
    jevArgument: "jev() には { state, questions } のオブジェクトを渡してください",
    llmEvaluateArgument: "llm.evaluate() には { state, questions } を渡してください",
    llmGenerateArgument: "llm.generate() には { prompt } を渡してください",
    serverUnreachable: (reason) =>
      `この教材のサーバーに接続できません（${reason}）。bun run dev が動いているか確認してください`,
    unhandledRejection: (detail) => `await していない処理が失敗しました: ${detail}`,
    workerCrashed: "実行環境でエラーが起きました",
  },
  en: {
    jevArgument: "Pass jev() an object of { state, questions }",
    llmEvaluateArgument: "Pass llm.evaluate() an object of { state, questions }",
    llmGenerateArgument: "Pass llm.generate() an object of { prompt }",
    serverUnreachable: (reason) =>
      `Cannot connect to this tutorial's server (${reason}). Check that bun run dev is running`,
    unhandledRejection: (detail) => `A promise that was not awaited failed: ${detail}`,
    workerCrashed: "An error occurred in the code runner",
  },
};
