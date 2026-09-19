import { ResultAsync } from "neverthrow";
import type { StatusResponse } from "../../contract/jev.ts";

export function fetchStatus(): ResultAsync<StatusResponse, string> {
  return ResultAsync.fromPromise(
    fetch("/api/status").then(async (response) => {
      if (!response.ok) throw new Error(`/api/status が ${response.status} を返しました`);
      return (await response.json()) as StatusResponse;
    }),
    (error) => (error instanceof Error ? error.message : String(error)),
  );
}
