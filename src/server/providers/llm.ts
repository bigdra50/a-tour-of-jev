// 小型 LLM を Vercel AI Gateway 経由で呼ぶ経路。
// evaluate は Jev と同じ質問を LLM に答えさせる（AI SDK の LLM 評価アダプタ）。
// generate は普通の文章生成。Jev は文章を生成しないので、生成が要る場面はこちらを使う。

import type { LanguageModelV4, LanguageModelV4CallOptions } from "@ai-sdk/provider";
import { Experimental_EvaluationLanguageModel } from "@ai-sdk/provider-utils/experimental-evaluation";
import { experimental_evaluate, generateText, wrapLanguageModel } from "ai";
import { ResultAsync } from "neverthrow";
import type {
  LlmEvaluateRequest,
  LlmGenerateRequest,
  SystemOneResponse,
  UpstreamTrace,
  Usage,
} from "../../contract/jev.ts";
import { llmCostUsd, type TokenPrice } from "../../contract/pricing.ts";
import { fromSdkAnswers, type SdkAnswer, toSdkQuestions, toUpstreamFailure } from "./ai-sdk-mapping.ts";
import { abortedFailure, type UpstreamFailure } from "./errors.ts";
import { GATEWAY_BASE_URL } from "./gateway.ts";

export interface LlmProviderOptions {
  readonly languageModel: (modelId: string) => LanguageModelV4;
  readonly price: (modelId: string) => Promise<TokenPrice | undefined>;
}

export interface LlmEvaluateResult {
  readonly response: SystemOneResponse;
  readonly upstream: UpstreamTrace;
  readonly costUsd: number | null;
}

export interface LlmGenerateResult {
  readonly model: string;
  readonly text: string;
  readonly usage: Usage;
  readonly upstream: UpstreamTrace;
  readonly costUsd: number | null;
}

type CallOptions = { readonly signal?: AbortSignal };

export interface LlmProvider {
  evaluate(request: LlmEvaluateRequest, options?: CallOptions): ResultAsync<LlmEvaluateResult, UpstreamFailure>;
  generate(request: LlmGenerateRequest, options?: CallOptions): ResultAsync<LlmGenerateResult, UpstreamFailure>;
}

/** LLM に実際に渡したプロンプトを記録する。LLM 評価アダプタが何を送っているかを学習者に見せるため。 */
function recordingModel(model: LanguageModelV4) {
  const calls: LanguageModelV4CallOptions[] = [];
  const wrapped = wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v4",
      wrapGenerate: async ({ doGenerate, params }) => {
        calls.push(params);
        return doGenerate();
      },
    },
  });
  return { model: wrapped, calls };
}

function trace(modelId: string, params: LanguageModelV4CallOptions | undefined): UpstreamTrace {
  return {
    method: "POST",
    url: `${GATEWAY_BASE_URL}/language-model`,
    headers: { Authorization: "Bearer $AI_GATEWAY_API_KEY", "ai-model-id": modelId },
    body: params ? { prompt: params.prompt, responseFormat: params.responseFormat } : null,
  };
}

const toUsage = (usage: { inputTokens?: number; outputTokens?: number }): Usage => ({
  input_tokens: usage.inputTokens ?? 0,
  output_tokens: usage.outputTokens ?? 0,
});

export function createLlmProvider(options: LlmProviderOptions): LlmProvider {
  const wrap = <T>(model: string, signal: AbortSignal | undefined, run: Promise<T>) =>
    ResultAsync.fromPromise(run, (error) =>
      signal?.aborted ? abortedFailure() : toUpstreamFailure(error, `LLM（${model}）`),
    );

  async function evaluate(request: LlmEvaluateRequest, signal: AbortSignal | undefined): Promise<LlmEvaluateResult> {
    const recorder = recordingModel(options.languageModel(request.model));
    const result = await experimental_evaluate({
      model: new Experimental_EvaluationLanguageModel({ model: recorder.model }),
      state: request.state as never,
      questions: toSdkQuestions(request.questions),
      maxRetries: 1,
      abortSignal: signal,
    });
    const usage = toUsage(result.usage);
    return {
      response: {
        model: request.model,
        answers: fromSdkAnswers(request.questions, result.answers as Record<string, SdkAnswer>),
        usage,
      },
      upstream: trace(request.model, recorder.calls[0]),
      costUsd: llmCostUsd(usage, await options.price(request.model)),
    };
  }

  async function generate(request: LlmGenerateRequest, signal: AbortSignal | undefined): Promise<LlmGenerateResult> {
    const recorder = recordingModel(options.languageModel(request.model));
    const result = await generateText({
      model: recorder.model,
      instructions: request.system,
      prompt: request.prompt,
      maxOutputTokens: request.maxOutputTokens,
      maxRetries: 1,
      abortSignal: signal,
    });
    const usage = toUsage(result.usage);
    return {
      model: request.model,
      text: result.text,
      usage,
      upstream: trace(request.model, recorder.calls[0]),
      costUsd: llmCostUsd(usage, await options.price(request.model)),
    };
  }

  return {
    evaluate: (request, { signal } = {}) => wrap(request.model, signal, evaluate(request, signal)),
    generate: (request, { signal } = {}) => wrap(request.model, signal, generate(request, signal)),
  };
}
