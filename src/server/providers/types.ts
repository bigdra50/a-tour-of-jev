import type { ResultAsync } from "neverthrow";
import type { ProviderId, SystemOneRequest, SystemOneResponse, UpstreamTrace } from "../../contract/jev.ts";
import type { Localized } from "../../contract/lang.ts";
import type { UpstreamFailure } from "./errors.ts";

export interface JevProviderResult {
  readonly response: SystemOneResponse;
  readonly upstream: UpstreamTrace;
  readonly notes: readonly Localized[];
}

/** Jev を呼ぶ経路。TypeSafe API と Vercel AI Gateway で同じ形の答えを返す。 */
export interface JevProvider {
  readonly id: ProviderId;
  readonly models: readonly string[];
  evaluate(
    request: SystemOneRequest,
    options?: { readonly signal?: AbortSignal },
  ): ResultAsync<JevProviderResult, UpstreamFailure>;
}
