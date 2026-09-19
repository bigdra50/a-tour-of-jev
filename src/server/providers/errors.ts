import type { Localized } from "../../contract/lang.ts";

/** 上流（TypeSafe / Vercel AI Gateway）の失敗。status は上流の HTTP ステータス、接続失敗は 502、中断は 499。 */
export interface UpstreamFailure {
  readonly kind: "upstream";
  readonly status: number;
  /** 画面に出す説明。上流の英語のエラー文は両方の言語にそのまま入れる。 */
  readonly message: Localized;
  readonly details?: unknown;
}

export const upstreamFailure = (status: number, message: Localized, details?: unknown): UpstreamFailure =>
  details === undefined ? { kind: "upstream", status, message } : { kind: "upstream", status, message, details };

export const ABORTED_STATUS = 499;
export const abortedFailure = (): UpstreamFailure =>
  upstreamFailure(ABORTED_STATUS, { ja: "呼び出しを中断しました", en: "The call was aborted" });

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);

/** 上流のエラー本文から人が読める一文を取り出す。形は API ごとに違うので主な形を順に試す。 */
export function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === "string") return body.trim() || undefined;
  if (!isObject(body)) return undefined;
  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;
  if (isObject(body.error) && typeof body.error.message === "string") return body.error.message;
  if (typeof body.detail === "string") return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail
      .map((item) => {
        if (!isObject(item)) return String(item);
        const loc = Array.isArray(item.loc) ? item.loc.join(".") : undefined;
        return [loc, typeof item.msg === "string" ? item.msg : undefined].filter(Boolean).join(": ");
      })
      .join("; ");
  }
  return undefined;
}
