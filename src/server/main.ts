// ローカルサーバーの起動。API キーはこのプロセスの中だけで使い、ブラウザには渡さない。
// .env.local は Bun の自動読み込みを切って（--no-env-file）自前で読む。
// シェルの変数が .env.local の同名変数を隠しても、両方のキーを拾えるようにするため（credentials.ts 参照）。

import { createGateway } from "@ai-sdk/gateway";
import { parseLang } from "../contract/lang.ts";
import homepage from "../web/index.html";
import { createApi } from "./api.ts";
import { type Credentials, maskKey, parseEnvFile, resolveCredentials } from "./credentials.ts";
import { createModelCatalog } from "./gateway-models.ts";
import { createGatewayJevProvider } from "./providers/gateway.ts";
import { createLlmProvider } from "./providers/llm.ts";
import { createTypeSafeProvider } from "./providers/typesafe.ts";

const ROOT = new URL("../../", import.meta.url);
const production = process.env.NODE_ENV === "production";
// 端末に出すログの言語。ブラウザの画面の言語とは別に、端末のロケールに合わせる
const lang = parseLang(process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG);

async function readEnvLocal(): Promise<Record<string, string>> {
  const file = Bun.file(new URL(".env.local", ROOT));
  return (await file.exists()) ? parseEnvFile(await file.text()) : {};
}

/** 学習者のコードを動かす Web Worker。Bun の HTML バンドラは Worker を束ねないので、ここで別にビルドする。 */
async function buildWorker(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [new URL("src/web/runner/worker.ts", ROOT).pathname],
    target: "browser",
    format: "esm",
    minify: production,
    sourcemap: production ? "none" : "inline",
  });
  const output = result.outputs[0];
  if (!result.success || !output) {
    const heading = lang === "ja" ? "Worker のビルドに失敗しました" : "Failed to build the worker";
    throw new Error(`${heading}:\n${result.logs.map(String).join("\n")}`);
  }
  return output.text();
}

function describeKeys(credentials: Credentials): string[] {
  const notSet = lang === "ja" ? "未設定" : "not set";
  const width = "Vercel AI Gateway".length;
  const line = (label: string, key: Credentials["typesafe"]) =>
    key ? `  ${label.padEnd(width)}: ${key.from[lang]} ${maskKey(key.key)}` : `  ${label.padEnd(width)}: ${notSet}`;
  return [line("TypeSafe API", credentials.typesafe), line("Vercel AI Gateway", credentials.gateway)];
}

const envLocal = await readEnvLocal();
const credentials = resolveCredentials([
  { origin: { ja: "環境変数", en: "environment variable" }, vars: process.env },
  { origin: ".env.local", vars: envLocal },
]);

const gateway = credentials.gateway ? createGateway({ apiKey: credentials.gateway.key }) : undefined;
const catalog = createModelCatalog();
const api = createApi({
  credentials,
  jev: {
    ...(credentials.typesafe
      ? {
          typesafe: createTypeSafeProvider({
            apiKey: credentials.typesafe.key,
            // 公式 SDK と同じ変数名。プロキシや検証用の差し替えに使う
            baseURL: process.env.TYPESAFE_BASE_URL ?? envLocal.TYPESAFE_BASE_URL,
          }),
        }
      : {}),
    ...(gateway ? { gateway: createGatewayJevProvider({ evaluationModel: (id) => gateway.evaluationModel(id) }) } : {}),
  },
  ...(gateway
    ? { llm: createLlmProvider({ languageModel: (id) => gateway.languageModel(id), price: catalog.price }) }
    : {}),
  llmModels: catalog.curated,
});

const workerSource = await buildWorker();
const port = Number(process.env.PORT ?? envLocal.PORT ?? 8765);

const server = Bun.serve({
  // API キーを持つサーバーなので、同じ LAN のほかの端末からは届かないようにする
  hostname: "127.0.0.1",
  port,
  development: !production,
  routes: {
    "/": homepage,
    "/runner-worker.js": () =>
      new Response(workerSource, { headers: { "content-type": "text/javascript; charset=utf-8" } }),
  },
  async fetch(request) {
    return (await api(request)) ?? new Response("Not Found", { status: 404 });
  },
});

console.log(
  [
    `A Tour of Jev: http://localhost:${server.port}/`,
    ...describeKeys(credentials),
    ...credentials.notes.map((note) => (lang === "ja" ? `  注: ${note.ja}` : `  Note: ${note.en}`)),
    ...(credentials.typesafe || credentials.gateway
      ? []
      : [
          lang === "ja"
            ? "  キーが 1 つもありません。.env.example を .env.local にコピーして値を入れ、再起動してください"
            : "  No API keys found. Copy .env.example to .env.local, fill in the values, and restart",
        ]),
  ].join("\n"),
);
