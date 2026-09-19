// 学習者のコードを async 関数の本体として実行する。
// scope のキーを引数名にして渡すので、コードからはグローバル変数のように見える。

export interface UserCodeError {
  readonly kind: "syntax" | "runtime";
  readonly message: string;
  /** 学習者のコード上の行（1 始まり）。取れないときは undefined。 */
  readonly line?: number;
}

export type UserCodeResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: UserCodeError };

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => AsyncFn;

// 生成される関数は「async function anonymous(引数\n) {\n"use strict";\n本文」なので、本文は 4 行目から始まる。
const PRELUDE = '"use strict";\n';
const LINE_OFFSET = 3;

function lineOf(error: unknown): number | undefined {
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  const match = /<anonymous>:(\d+):\d+/.exec(stack);
  if (!match) return undefined;
  const line = Number(match[1]) - LINE_OFFSET;
  return line >= 1 ? line : undefined;
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export async function runUserCode(code: string, scope: Readonly<Record<string, unknown>>): Promise<UserCodeResult> {
  const names = Object.keys(scope);
  let fn: AsyncFn;
  try {
    fn = new AsyncFunction(...names, PRELUDE + code);
  } catch (error) {
    return { ok: false, error: { kind: "syntax", message: messageOf(error) } };
  }
  try {
    return { ok: true, value: await fn(...names.map((name) => scope[name])) };
  } catch (error) {
    const line = lineOf(error);
    return {
      ok: false,
      error:
        line === undefined
          ? { kind: "runtime", message: messageOf(error) }
          : { kind: "runtime", message: messageOf(error), line },
    };
  }
}
