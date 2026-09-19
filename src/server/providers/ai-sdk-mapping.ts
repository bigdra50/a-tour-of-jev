// TypeSafe の質問・答えの形と、AI SDK（experimental_evaluate）の形の相互変換。
// AI SDK では Noul を boolean と呼び、答えのフィールドも noul ではなく probability になる。
// confidence は答えに含まれず、providerMetadata.typesafe.confidence に質問 ID ごとに入る。

import type { Experimental_EvaluationModelV4Question as SdkQuestion } from "@ai-sdk/provider";
import { APICallError, RetryError } from "ai";
import type { Answer, EntryType, Question, Questions } from "../../contract/jev.ts";
import { extractErrorMessage, type UpstreamFailure, upstreamFailure } from "./errors.ts";

type SdkInput = Extract<SdkQuestion, { type: "boolean" }>["instructions"];

export type SdkAnswer =
  | { readonly type: "choice"; readonly choice: string; readonly probabilities?: Readonly<Record<string, number>> }
  | { readonly type: "score"; readonly score: number; readonly probabilities?: Readonly<Record<string, number>> }
  | { readonly type: "boolean"; readonly probability: number };

function toSdkQuestion(question: Question): SdkQuestion {
  // AI SDK では instructions が必須で null も受け付けない。TypeSafe では省略できるので空文字で補う。
  const instructions = (question.instructions ?? "") as SdkInput;
  switch (question.type) {
    case "noul":
      return question.criteria
        ? { type: "boolean", instructions, criteria: question.criteria as never }
        : { type: "boolean", instructions };
    case "choice":
      return { type: "choice", instructions, criteria: question.criteria as never };
    case "score":
      return { type: "score", instructions, criteria: question.criteria as never };
  }
}

export function toSdkQuestions(questions: Questions): Record<string, SdkQuestion> {
  return Object.fromEntries(Object.entries(questions).map(([id, q]) => [id, toSdkQuestion(q)]));
}

export function legendFor(criteria: readonly EntryType[]): Record<string, EntryType> {
  return Object.fromEntries(criteria.map((level, index) => [String(index), level]));
}

export function fromSdkAnswer(question: Question | undefined, answer: SdkAnswer, confidence?: number): Answer {
  const distribution = {
    ...(answer.type !== "boolean" && answer.probabilities ? { probabilities: answer.probabilities } : {}),
    ...(confidence !== undefined ? { confidence } : {}),
  };
  switch (answer.type) {
    case "boolean":
      return { type: "noul", noul: answer.probability };
    case "choice":
      return { type: "choice", choice: answer.choice, ...distribution };
    case "score":
      return {
        type: "score",
        score: answer.score,
        ...distribution,
        ...(question?.type === "score" ? { legend: legendFor(question.criteria) } : {}),
      };
  }
}

export function fromSdkAnswers(
  questions: Questions,
  answers: Readonly<Record<string, SdkAnswer>>,
  confidence: Readonly<Record<string, unknown>> = {},
): Record<string, Answer> {
  return Object.fromEntries(
    Object.entries(answers).map(([id, answer]) => {
      const c = confidence[id];
      return [id, fromSdkAnswer(questions[id], answer, typeof c === "number" ? c : undefined)];
    }),
  );
}

function parseMaybeJson(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** AI SDK / Gateway の例外を UpstreamFailure にそろえる。 */
export function toUpstreamFailure(error: unknown, label: string): UpstreamFailure {
  if (RetryError.isInstance(error)) return toUpstreamFailure(error.lastError, label);

  if (APICallError.isInstance(error)) {
    const details = parseMaybeJson(error.responseBody);
    const detail = extractErrorMessage(details) ?? error.message;
    const status = error.statusCode ?? 502;
    return upstreamFailure(
      status,
      { ja: `${label} が ${status} を返しました: ${detail}`, en: `${label} returned ${status}: ${detail}` },
      details,
    );
  }

  const status =
    typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : 502;
  const message = error instanceof Error ? error.message : String(error);
  return upstreamFailure(status, {
    ja: `${label} の呼び出しに失敗しました: ${message}`,
    en: `The ${label} call failed: ${message}`,
  });
}
