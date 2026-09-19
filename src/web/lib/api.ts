import { ResultAsync } from "neverthrow";
import type { StatusResponse } from "../../contract/jev.ts";
import type { Lang } from "../../contract/lang.ts";

/** キーの出どころや注記は、サーバーが Accept-Language の言語で返す。 */
export function fetchStatus(lang: Lang): ResultAsync<StatusResponse, string> {
  return ResultAsync.fromPromise(
    fetch("/api/status", { headers: { "accept-language": lang } }).then(async (response) => {
      if (!response.ok) throw new Error(`/api/status: HTTP ${response.status}`);
      return (await response.json()) as StatusResponse;
    }),
    (error) => (error instanceof Error ? error.message : String(error)),
  );
}
