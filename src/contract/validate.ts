// リクエストの形の検証。学習者に分かる言葉（日本語と英語）で、問題をまとめて返す。
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
import type { Localized } from "./lang.ts";

export type Validation<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly Localized[] };

// 上限の根拠: https://docs.typesafe.ai/primitives/choice （最大 255 個）
// https://docs.typesafe.ai/primitives/score （2〜10 レベル）
const CHOICE_MAX_OPTIONS = 255;
const SCORE_MIN_LEVELS = 2;
const SCORE_MAX_LEVELS = 10;
const PROVIDERS: readonly ProviderId[] = ["typesafe", "gateway"];

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);

const isEntry = (value: unknown): boolean => value === null || typeof value === "string" || typeof value === "object";

const describe = (value: unknown): Localized => {
  if (value === null) return { ja: "null", en: "null" };
  if (Array.isArray(value)) return { ja: "配列", en: "array" };
  return { ja: typeof value, en: typeof value };
};

function checkState(value: unknown, issues: Localized[]): void {
  if (value === undefined) {
    issues.push({
      ja: "state: 必須です。評価したい文章か JSON を入れてください",
      en: "state: required. Put in the text or JSON to evaluate",
    });
  } else if (!(typeof value === "string" || typeof value === "object") || value === null) {
    const got = describe(value);
    issues.push({
      ja: `state: 文字列・オブジェクト・配列のいずれかにしてください（今は ${got.ja}）`,
      en: `state: must be a string, object, or array (got ${got.en})`,
    });
  }
}

function checkQuestion(id: string, question: unknown, issues: Localized[]): void {
  const path = `questions.${id}`;
  if (!isObject(question)) {
    issues.push({
      ja: `${path}: 質問はオブジェクトにしてください（noul() / choice() / score() で作れます）`,
      en: `${path}: a question must be an object (you can create one with noul() / choice() / score())`,
    });
    return;
  }
  if ("instructions" in question && !isEntry(question.instructions)) {
    issues.push({
      ja: `${path}.instructions: 文字列・オブジェクト・配列・null のいずれかにしてください`,
      en: `${path}.instructions: must be a string, object, array, or null`,
    });
  }
  const { type, criteria } = question;
  switch (type) {
    case "noul": {
      if (criteria === undefined || criteria === null) return;
      if (!isObject(criteria)) {
        issues.push({
          ja: `${path}.criteria: Noul の criteria は { true, false } の形にしてください`,
          en: `${path}.criteria: a Noul's criteria must look like { true, false }`,
        });
        return;
      }
      const extra = Object.keys(criteria)
        .filter((key) => key !== "true" && key !== "false")
        .join(", ");
      if (extra !== "") {
        issues.push({
          ja: `${path}.criteria: Noul の criteria に使えるキーは true と false だけです（${extra}）`,
          en: `${path}.criteria: a Noul's criteria can only have the keys true and false (${extra})`,
        });
      }
      return;
    }
    case "choice": {
      if (!isObject(criteria)) {
        issues.push({
          ja: `${path}.criteria: Choice の criteria は { 選択肢名: 説明 } のオブジェクトにしてください`,
          en: `${path}.criteria: a Choice's criteria must be an object of { optionName: description }`,
        });
        return;
      }
      const count = Object.keys(criteria).length;
      if (count < 1 || count > CHOICE_MAX_OPTIONS) {
        issues.push({
          ja: `${path}.criteria: Choice の選択肢は 1〜${CHOICE_MAX_OPTIONS} 個にしてください（今は ${count} 個）`,
          en: `${path}.criteria: a Choice needs 1 to ${CHOICE_MAX_OPTIONS} options (got ${count})`,
        });
      }
      for (const [option, text] of Object.entries(criteria)) {
        if (!isEntry(text)) {
          issues.push({
            ja: `${path}.criteria.${option}: 説明は文字列・オブジェクト・配列・null にしてください`,
            en: `${path}.criteria.${option}: a description must be a string, object, array, or null`,
          });
        }
      }
      return;
    }
    case "score": {
      if (!Array.isArray(criteria)) {
        issues.push({
          ja: `${path}.criteria: Score の criteria は低い順に並べたレベルの配列にしてください`,
          en: `${path}.criteria: a Score's criteria must be an array of levels ordered from low to high`,
        });
        return;
      }
      if (criteria.length < SCORE_MIN_LEVELS || criteria.length > SCORE_MAX_LEVELS) {
        issues.push({
          ja: `${path}.criteria: Score のレベルは ${SCORE_MIN_LEVELS}〜${SCORE_MAX_LEVELS} 個にしてください（今は ${criteria.length} 個）`,
          en: `${path}.criteria: a Score needs ${SCORE_MIN_LEVELS} to ${SCORE_MAX_LEVELS} levels (got ${criteria.length})`,
        });
      }
      criteria.forEach((level, index) => {
        if (!isEntry(level)) {
          issues.push({
            ja: `${path}.criteria[${index}]: レベルの説明は文字列・オブジェクト・配列・null にしてください`,
            en: `${path}.criteria[${index}]: a level description must be a string, object, array, or null`,
          });
        }
      });
      return;
    }
    default:
      issues.push({
        ja: `${path}.type: "noul"・"choice"・"score" のいずれかにしてください（今は ${JSON.stringify(type)}）`,
        en: `${path}.type: must be "noul", "choice", or "score" (got ${JSON.stringify(type)})`,
      });
  }
}

function checkQuestions(value: unknown, issues: Localized[]): void {
  if (!isObject(value) || Object.keys(value).length === 0) {
    issues.push({
      ja: "questions: 質問 ID → 質問 のオブジェクトを 1 つ以上入れてください",
      en: "questions: put in an object of question ID → question, with at least one question",
    });
    return;
  }
  for (const [id, question] of Object.entries(value)) checkQuestion(id, question, issues);
}

function checkOptionalString(body: Obj, key: string, issues: Localized[]): void {
  if (key in body && body[key] !== undefined && (typeof body[key] !== "string" || body[key] === "")) {
    issues.push({ ja: `${key}: 空でない文字列にしてください`, en: `${key}: must be a non-empty string` });
  }
}

function checkRequiredString(body: Obj, key: string, issues: Localized[]): void {
  if (typeof body[key] !== "string" || body[key] === "") {
    issues.push({ ja: `${key}: 必須です（空でない文字列）`, en: `${key}: required (a non-empty string)` });
  }
}

const notObject = <T>(): Validation<T> => ({
  ok: false,
  issues: [{ ja: "リクエスト本文は JSON オブジェクトにしてください", en: "The request body must be a JSON object" }],
});

export function validateSystemOneRequest(body: unknown): Validation<PlaygroundSystemOneRequest> {
  if (!isObject(body)) return notObject();
  const issues: Localized[] = [];
  checkState(body.state, issues);
  checkQuestions(body.questions, issues);
  checkOptionalString(body, "model", issues);
  if (body.provider !== undefined && !PROVIDERS.includes(body.provider as ProviderId)) {
    const got = JSON.stringify(body.provider);
    issues.push({
      ja: `provider: "typesafe" か "gateway" にしてください（今は ${got}）`,
      en: `provider: must be "typesafe" or "gateway" (got ${got})`,
    });
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
  const issues: Localized[] = [];
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
  const issues: Localized[] = [];
  checkRequiredString(body, "model", issues);
  checkRequiredString(body, "prompt", issues);
  checkOptionalString(body, "system", issues);
  const max = body.maxOutputTokens;
  if (max !== undefined && !(Number.isInteger(max) && (max as number) > 0)) {
    issues.push({ ja: "maxOutputTokens: 正の整数にしてください", en: "maxOutputTokens: must be a positive integer" });
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
