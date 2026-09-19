// リクエストの形の検証。学習者に分かる日本語で、問題をまとめて返す。
// 上流 API と食い違わないよう、公式ドキュメントに明記された制約だけを検査する。
// それ以外（instructions の中身など）は上流の 422 にまかせる。

import type {
  LlmEvaluateRequest,
  LlmGenerateRequest,
  PlaygroundSystemOneRequest,
  ProviderId,
  Questions,
  State,
} from "./jev.ts";

export type Validation<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly string[] };

// 上限の根拠: https://docs.typesafe.ai/primitives/choice （最大 255 個）
// https://docs.typesafe.ai/primitives/score （2〜10 レベル）
const CHOICE_MAX_OPTIONS = 255;
const SCORE_MIN_LEVELS = 2;
const SCORE_MAX_LEVELS = 10;
const PROVIDERS: readonly ProviderId[] = ["typesafe", "gateway"];

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);

const isEntry = (value: unknown): boolean => value === null || typeof value === "string" || typeof value === "object";

const describe = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "配列";
  return typeof value;
};

function checkState(value: unknown, issues: string[]): void {
  if (value === undefined) {
    issues.push("state: 必須です。評価したい文章か JSON を入れてください");
  } else if (!(typeof value === "string" || typeof value === "object") || value === null) {
    issues.push(`state: 文字列・オブジェクト・配列のいずれかにしてください（今は ${describe(value)}）`);
  }
}

function checkQuestion(id: string, question: unknown, issues: string[]): void {
  const path = `questions.${id}`;
  if (!isObject(question)) {
    issues.push(`${path}: 質問はオブジェクトにしてください（noul() / choice() / score() で作れます）`);
    return;
  }
  if ("instructions" in question && !isEntry(question.instructions)) {
    issues.push(`${path}.instructions: 文字列・オブジェクト・配列・null のいずれかにしてください`);
  }
  const { type, criteria } = question;
  switch (type) {
    case "noul": {
      if (criteria === undefined || criteria === null) return;
      if (!isObject(criteria)) {
        issues.push(`${path}.criteria: Noul の criteria は { true, false } の形にしてください`);
        return;
      }
      const extra = Object.keys(criteria).filter((key) => key !== "true" && key !== "false");
      if (extra.length > 0) {
        issues.push(`${path}.criteria: Noul の criteria に使えるキーは true と false だけです（${extra.join(", ")}）`);
      }
      return;
    }
    case "choice": {
      if (!isObject(criteria)) {
        issues.push(`${path}.criteria: Choice の criteria は { 選択肢名: 説明 } のオブジェクトにしてください`);
        return;
      }
      const count = Object.keys(criteria).length;
      if (count < 1 || count > CHOICE_MAX_OPTIONS) {
        issues.push(
          `${path}.criteria: Choice の選択肢は 1〜${CHOICE_MAX_OPTIONS} 個にしてください（今は ${count} 個）`,
        );
      }
      for (const [option, text] of Object.entries(criteria)) {
        if (!isEntry(text))
          issues.push(`${path}.criteria.${option}: 説明は文字列・オブジェクト・配列・null にしてください`);
      }
      return;
    }
    case "score": {
      if (!Array.isArray(criteria)) {
        issues.push(`${path}.criteria: Score の criteria は低い順に並べたレベルの配列にしてください`);
        return;
      }
      if (criteria.length < SCORE_MIN_LEVELS || criteria.length > SCORE_MAX_LEVELS) {
        issues.push(
          `${path}.criteria: Score のレベルは ${SCORE_MIN_LEVELS}〜${SCORE_MAX_LEVELS} 個にしてください（今は ${criteria.length} 個）`,
        );
      }
      criteria.forEach((level, index) => {
        if (!isEntry(level))
          issues.push(`${path}.criteria[${index}]: レベルの説明は文字列・オブジェクト・配列・null にしてください`);
      });
      return;
    }
    default:
      issues.push(`${path}.type: "noul"・"choice"・"score" のいずれかにしてください（今は ${JSON.stringify(type)}）`);
  }
}

function checkQuestions(value: unknown, issues: string[]): void {
  if (!isObject(value) || Object.keys(value).length === 0) {
    issues.push("questions: 質問 ID → 質問 のオブジェクトを 1 つ以上入れてください");
    return;
  }
  for (const [id, question] of Object.entries(value)) checkQuestion(id, question, issues);
}

function checkOptionalString(body: Obj, key: string, issues: string[]): void {
  if (key in body && body[key] !== undefined && (typeof body[key] !== "string" || body[key] === "")) {
    issues.push(`${key}: 空でない文字列にしてください`);
  }
}

function checkRequiredString(body: Obj, key: string, issues: string[]): void {
  if (typeof body[key] !== "string" || body[key] === "") {
    issues.push(`${key}: 必須です（空でない文字列）`);
  }
}

const notObject = <T>(): Validation<T> => ({
  ok: false,
  issues: ["リクエスト本文は JSON オブジェクトにしてください"],
});

export function validateSystemOneRequest(body: unknown): Validation<PlaygroundSystemOneRequest> {
  if (!isObject(body)) return notObject();
  const issues: string[] = [];
  checkState(body.state, issues);
  checkQuestions(body.questions, issues);
  checkOptionalString(body, "model", issues);
  if (body.provider !== undefined && !PROVIDERS.includes(body.provider as ProviderId)) {
    issues.push(`provider: "typesafe" か "gateway" にしてください（今は ${JSON.stringify(body.provider)}）`);
  }
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      state: body.state as State,
      questions: body.questions as Questions,
      ...(typeof body.model === "string" ? { model: body.model } : {}),
      ...(typeof body.provider === "string" ? { provider: body.provider as ProviderId } : {}),
    },
  };
}

export function validateLlmEvaluateRequest(body: unknown): Validation<LlmEvaluateRequest> {
  if (!isObject(body)) return notObject();
  const issues: string[] = [];
  checkRequiredString(body, "model", issues);
  checkState(body.state, issues);
  checkQuestions(body.questions, issues);
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      model: body.model as string,
      state: body.state as State,
      questions: body.questions as Questions,
    },
  };
}

export function validateLlmGenerateRequest(body: unknown): Validation<LlmGenerateRequest> {
  if (!isObject(body)) return notObject();
  const issues: string[] = [];
  checkRequiredString(body, "model", issues);
  checkRequiredString(body, "prompt", issues);
  checkOptionalString(body, "system", issues);
  const max = body.maxOutputTokens;
  if (max !== undefined && !(Number.isInteger(max) && (max as number) > 0)) {
    issues.push("maxOutputTokens: 正の整数にしてください");
  }
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      model: body.model as string,
      prompt: body.prompt as string,
      ...(typeof body.system === "string" ? { system: body.system } : {}),
      ...(typeof max === "number" ? { maxOutputTokens: max } : {}),
    } satisfies LlmGenerateRequest,
  };
}
