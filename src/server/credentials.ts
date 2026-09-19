// API キーの解決。キーの値はここから外へ出さない（ログ・注記・API 応答に含めない）。

export interface CredentialSource {
  /** 表示用の出どころ（例: "環境変数"、".env.local"）。 */
  readonly origin: string;
  readonly vars: Readonly<Record<string, string | undefined>>;
}

export interface ResolvedKey {
  readonly key: string;
  readonly from: string;
}

export interface Credentials {
  readonly typesafe?: ResolvedKey;
  readonly gateway?: ResolvedKey;
  readonly notes: readonly string[];
}

// TYPESAFE_API_KEY は公式 SDK、TYPESAFE_AI_API_KEY は AI SDK の TypeSafe プロバイダが読む名前。
const TYPESAFE_VARS = ["TYPESAFE_API_KEY", "TYPESAFE_AI_API_KEY"] as const;
const GATEWAY_VARS = ["AI_GATEWAY_API_KEY"] as const;
// Vercel AI Gateway のキーは vck_ で始まる（https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys）。
const GATEWAY_KEY_PREFIX = "vck_";

interface Candidate {
  readonly target: "typesafe" | "gateway";
  readonly key: string;
  readonly from: string;
  /** Gateway 用の変数以外に Gateway のキーが入っていた。 */
  readonly misplaced: boolean;
}

function candidatesOf({ origin, vars }: CredentialSource): Candidate[] {
  return [...TYPESAFE_VARS, ...GATEWAY_VARS].flatMap((name) => {
    const key = vars[name]?.trim();
    if (!key) return [];
    const isGatewayVar = (GATEWAY_VARS as readonly string[]).includes(name);
    const isGatewayKey = key.startsWith(GATEWAY_KEY_PREFIX);
    return [
      {
        target: isGatewayVar || isGatewayKey ? "gateway" : "typesafe",
        key,
        from: `${name}（${origin}）`,
        misplaced: isGatewayKey && !isGatewayVar,
      } satisfies Candidate,
    ];
  });
}

/**
 * 先に渡したソースほど優先する。
 * ソースをまたいで全候補を見るのは、シェルの TYPESAFE_API_KEY（Gateway のキー）が
 * .env.local の同名変数（TypeSafe のキー）を隠してしまう構成でも両方を使えるようにするため。
 */
export function resolveCredentials(sources: readonly CredentialSource[]): Credentials {
  const candidates = sources.flatMap(candidatesOf);
  const typesafe = candidates.find((c) => c.target === "typesafe");
  const gateway = candidates.find((c) => c.target === "gateway");
  return {
    ...(typesafe ? { typesafe: { key: typesafe.key, from: typesafe.from } } : {}),
    ...(gateway ? { gateway: { key: gateway.key, from: gateway.from } } : {}),
    notes: gateway?.misplaced
      ? [`${gateway.from} は Vercel AI Gateway のキー（vck_ で始まる）なので、Gateway 経由の呼び出しに使います`]
      : [],
  };
}

/** 接頭辞（最初の "_" まで）と末尾 4 文字だけ残す。 */
export function maskKey(key: string): string {
  if (key.length < 8) return "…";
  const prefixEnd = key.indexOf("_");
  const prefix = prefixEnd > 0 && prefixEnd <= 4 ? key.slice(0, prefixEnd + 1) : "";
  return `${prefix}…${key.slice(-4)}`;
}

/** .env 形式の最小限のパーサ。変数展開や複数行の値は扱わない。 */
export function parseEnvFile(text: string): Record<string, string> {
  return Object.fromEntries(
    text.split(/\r?\n/).flatMap((raw) => {
      const line = raw.trim();
      if (line === "" || line.startsWith("#")) return [];
      const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) return [];
      const [, name = "", rawValue = ""] = match;
      const value = rawValue.trim();
      const quote = value[0];
      const unquoted =
        (quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2 ? value.slice(1, -1) : value;
      return [[name, unquoted]];
    }),
  );
}
