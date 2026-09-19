// Vercel AI Gateway 経由で Jev を呼ぶ経路（AI SDK の experimental_evaluate を使う）。

import type { Experimental_EvaluationModelV4 } from "@ai-sdk/provider";
import { experimental_evaluate } from "ai";
import { ResultAsync } from "neverthrow";
import type { SystemOneRequest, UpstreamTrace } from "../../contract/jev.ts";
import type { Localized } from "../../contract/lang.ts";
import { fromSdkAnswers, type SdkAnswer, toSdkQuestions, toUpstreamFailure } from "./ai-sdk-mapping.ts";
import { abortedFailure } from "./errors.ts";
import type { JevProvider, JevProviderResult } from "./types.ts";

// @ai-sdk/gateway の既定の接続先。学習用 trace の表示にだけ使う。
export const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v4/ai";
export const GATEWAY_JEV_MODEL = "typesafe-ai/jev";

export interface GatewayJevProviderOptions {
  readonly evaluationModel: (modelId: string) => Experimental_EvaluationModelV4;
  readonly defaultModel?: string;
}

export function createGatewayJevProvider(options: GatewayJevProviderOptions): JevProvider {
  const defaultModel = options.defaultModel ?? GATEWAY_JEV_MODEL;

  async function evaluate(request: SystemOneRequest, signal: AbortSignal | undefined): Promise<JevProviderResult> {
    const useRequested = request.model?.includes("/") ?? false;
    const modelId = useRequested && request.model ? request.model : defaultModel;
    const notes: Localized[] =
      request.model && !useRequested
        ? [
            {
              ja: `Gateway のモデル ID は "provider/model" 形式なので、"${request.model}" を ${defaultModel} に読み替えました`,
              en: `Gateway model IDs use the "provider/model" form, so "${request.model}" was read as ${defaultModel}`,
            },
          ]
        : [];

    const questions = toSdkQuestions(request.questions);
    const upstream: UpstreamTrace = {
      method: "POST",
      url: `${GATEWAY_BASE_URL}/evaluation-model`,
      headers: {
        Authorization: "Bearer $AI_GATEWAY_API_KEY",
        "ai-model-id": modelId,
        "ai-evaluation-model-specification-version": "4",
      },
      body: { state: request.state, questions },
    };

    const result = await experimental_evaluate({
      model: options.evaluationModel(modelId),
      state: request.state as never,
      questions,
      maxRetries: 2,
      abortSignal: signal,
    });
    const confidence = (result.providerMetadata?.typesafe?.confidence ?? {}) as Record<string, unknown>;
    return {
      response: {
        model: result.response.modelId,
        answers: fromSdkAnswers(request.questions, result.answers as Record<string, SdkAnswer>, confidence),
        usage: { input_tokens: result.usage.inputTokens ?? 0, output_tokens: result.usage.outputTokens ?? 0 },
      },
      upstream,
      notes,
    };
  }

  return {
    id: "gateway",
    models: [defaultModel],
    evaluate: (request, { signal } = {}) =>
      ResultAsync.fromPromise(evaluate(request, signal), (error) =>
        signal?.aborted ? abortedFailure() : toUpstreamFailure(error, "Vercel AI Gateway"),
      ),
  };
}
