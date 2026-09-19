import { evaluatedCalls, fail, notRunYet, pass, round2 } from "./checks.ts";
import aiSdkCode from "./code/ai-sdk.js" with { type: "text" };
import jaggednessCode from "./code/jaggedness.js" with { type: "text" };
import japaneseCode from "./code/japanese.js" with { type: "text" };
import vsLlmCode from "./code/vs-llm.js" with { type: "text" };
import withLlmCode from "./code/with-llm.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

export const limits: readonly Lesson[] = [
  {
    id: lessonId("jaggedness"),
    part: "limits",
    title: "苦手なこと",
    lead: "数える・計算する・日付を比べる・文章を書く。苦手なことはコードや別のモデルに任せる。",
    body: `
TypeSafe は、jev-1.13 が苦手なことを jaggedness（能力のでこぼこ）として公開しています。

| 苦手なこと | 代わりにすること |
| --- | --- |
| 書いたとおりにしか読まない | 条件を正確に書き、境目の例を criteria に入れる |
| 計算・数を数える | 計算はコードで。数えるなら 1 件ずつ聞いてコードで足す |
| 日付の前後や間隔 | 年・月・日を Choice で取り出し、比較はコードで |
| 何段もたどる参照、二重否定 | 段数を減らし、state の場所を名前で指す |
| 無関係な情報の多い state | 先に絞り込んでから渡す |
| 誘導を狙った入力 | criteria を明確に書き、事前に境目のケースを試す |
| instructions と criteria の食い違い | 両者の言葉をそろえる |
| 構造的な関係（確率の和など） | 1 つの判断は 1 つの聞き方で。関係はコードで保証する |
| 文章の生成 | 生成モデルを使う |

## 数を数える

jev-1.13 は、単語の文字数や一覧の件数を確実には数えられません。
答えの「形」を認識しているだけで、対象が大きいほど誤差も大きくなります。
正規表現やパーサで見つけられるものなら、そもそもモデルは要りません。
条件に合うものを数えたいときは、候補ごとに 1 問ずつ聞き、コードで足します。

右のコードは、ドキュメントにある果物の例で両方のやり方を比べます。

## 抽出は「選ぶ」に変える

Jev は文章を生成しません。
値を取り出したいときは、正規表現や生成モデルで候補を作り、Jev には候補の中から正しいものを選ばせます。
日付なら、月（12 択）や日（31 択）のような小さな Choice にして、「書かれていない」という選択肢も用意します。
組み立てと比較はコードで行います。
`,
    code: jaggednessCode,
    docs: [
      { title: "Jev 1.13 jaggedness", url: `${DOCS}/model-jaggedness/jev-1.13` },
      { title: "Date extraction (cookbook)", url: `${DOCS}/cookbooks/date_extraction_cookbook` },
      {
        title: "Pre-parsed value extraction (cookbook)",
        url: `${DOCS}/cookbooks/pre_parsed_value_extraction_cookbook`,
      },
    ],
  },
  {
    id: lessonId("japanese"),
    part: "limits",
    title: "日本語で使う",
    lead: "Jev の主な学習言語は英語。日本語も読めるが精度は下がるので、自分のデータで確かめる。",
    body: `
ドキュメントの Models のページには、次のように書かれています。

- 主な学習言語は英語で、精度がいちばん高いのも英語
- 日本語を含む CJK（中国語・日本語・韓国語）も扱えるが、英語と同じ精度ではない
- 英語以外で使うなら、自分の内容で試してから頼ること。振り分けでは confidence をよく見ること

## 比べ方

右のコードは、同じ内容の問い合わせを 3 つの組み合わせで評価します。

- state も質問も英語
- state も質問も日本語
- state は日本語のまま、質問（instructions と criteria）だけ英語

選ばれた選択肢だけでなく、\`confidence\` と確率の分布、入力トークン数も比べてください。
簡単な例では差が出ないこともあります。
判断の分かれそうな文（配送が遅れていて返金も考えている、など）で試すと違いが見えやすくなります。

業務で日本語の入力に使う前に、正解ラベルのついた日本語データで正答率を測っておくと安心です。
`,
    code: japaneseCode,
    docs: [{ title: "Models: language support", url: `${DOCS}/models#language-support` }],
  },
  {
    id: lessonId("vs-llm"),
    part: "limits",
    title: "小型 LLM と比べる",
    lead: "同じ質問を小型 LLM にも答えさせ、速さ・費用・答えの形を比べる。",
    requires: "llm",
    body: `
Vercel の AI SDK には、Jev と同じ形の質問（choice・score・boolean）を LLM に答えさせる仕組みがあります。
右のコードの \`llm.evaluate()\` はそれを使い、Vercel AI Gateway 経由で小型 LLM を呼びます。

## 何が違うか

| 観点 | Jev | LLM（AI SDK の評価アダプタ） |
| --- | --- | --- |
| Choice と Score の答え | 選んだ答え ＋ 全選択肢の確率 ＋ confidence | 選んだ答えだけ（分布なし） |
| Noul の値 | 較正（calibration）を目標に学習した確率 | 「確率を推定して」と頼んで出した数。較正の保証はない |
| 質問の扱い | 質問ごとに独立して並列に評価 | 全部の質問を 1 つのプロンプトで答える |
| 出力トークン | 無料 | 課金される |

較正とは、0.8 と答えたものが全体として 8 割くらい当たる、という性質のことです。
ドキュメントは、しきい値を決めるにはこの性質が大事だとしています。

## 見どころ

- 表の「ミリ秒」「費用USD」「出力トークン」を比べる
- 出力の「JSON を見る」で、LLM に実際に送ったプロンプトを見る。質問は \`q0\`、選択肢は \`c0\` のような内部コードに置き換えられている
- 何度か実行して、答えの揺れ方を比べる（前のレッスン「同じ質問を何度も聞く」）

このレッスンには Vercel AI Gateway のキー（\`AI_GATEWAY_API_KEY\`）が必要です。
比べる LLM はコードの \`LLM_MODEL\` で変えられます。
\`llm.evaluate()\` で \`model\` を省略すると、画面上部の「比べる LLM」で選んだモデルを使います。
`,
    code: vsLlmCode,
    exercise: {
      goal: "Jev と LLM をそれぞれ 5 回以上呼んで、`refund_requested` のばらつき（標準偏差）を比べましょう。",
      hint: "`Promise.all` で 5 回ずつ呼び、`stdev()` で標準偏差を出します。",
      check: (run) => {
        const jevCount = evaluatedCalls(run, "jev").length;
        const llmCount = evaluatedCalls(run, "llm-evaluate").length;
        if (jevCount + llmCount === 0) return notRunYet;
        return jevCount >= 5 && llmCount >= 5
          ? pass(`Jev ${jevCount} 回、LLM ${llmCount} 回。標準偏差を比べてみましょう`)
          : fail(`今は Jev ${jevCount} 回、LLM ${llmCount} 回です`);
      },
    },
    docs: [
      { title: "AI SDK: Evaluation", url: "https://ai-sdk.dev/docs/ai-sdk-core/evaluation" },
      { title: "AI primer（RLCD と較正）", url: `${DOCS}/introduction/machine-learning-primer` },
    ],
  },
  {
    id: lessonId("with-llm"),
    part: "limits",
    title: "LLM と組み合わせる",
    lead: "Jev が速く安く振り分けと検査を受け持ち、文章が要るところだけ LLM を呼ぶ。",
    requires: "llm",
    body: `
Jev は判断だけを返し、文章は書きません。
文章を書く必要があるなら LLM と組み合わせます。

| 役割 | 向いているもの |
| --- | --- |
| Jev | 分類・採点・yes/no。確率と confidence。多くの問い合わせは 100 ミリ秒ほど |
| LLM | 返信文や要約の生成、自由な形の抽出、何段階もの推論 |

## ドキュメントにある組み合わせ方

- **意図の振り分け**：Jev が分類して、決まった処理・専門の LLM・人のどれに回すかを決める。高い LLM は必要な問い合わせにだけ使う
- **ガードレール**：LLM への入力と LLM の出力を Jev の Noul で検査する（ジェイルブレイク、危険な依頼、規約違反など）
- **抽出のカスケード**：小型 LLM で抽出し、Jev が項目ごとに「おかしくないか」を検査して、怪しいときだけ大きな推論モデルに回す
- **候補から選ぶ**：正規表現や LLM が候補を作り、Jev がその中から正しいものを選ぶ
- **スマートホームのデモ**：依頼が複数の操作を含むかを Noul で判定し、含むなら LLM で 1 つずつに分けてから Jev で評価する。雑談は LLM に任せる

## 小さな LLM を組み合わせるべきか

生成が要るならイエスです。
判断だけで済むなら Jev だけで足ります。
基本の形は次の 2 つです。

- LLM が作ったものを Jev で検査する
- Jev の confidence が低いときに、LLM や人へ回す

右のコードは、振り分け（Jev）→ 返信文の生成（LLM）→ 返信の検査（Jev）の 3 段です。
出力の「ミリ秒」で、どの段に時間がかかっているかを見てください。
`,
    code: withLlmCode,
    exercise: {
      goal: '検査の `reply` に規約違反の文（例: "We will refund you $500 right away."）を直接入れて、`breaks_policy` が 0.5 を超えるか確かめましょう。',
      hint: "`reply: draft.text` を、規約違反の文字列に置き換えます。",
      check: (run) => {
        const call = evaluatedCalls(run).findLast((c) => "breaks_policy" in c.answers);
        const answer = call?.answers.breaks_policy;
        if (answer?.type !== "noul") return notRunYet;
        return answer.noul > 0.5
          ? pass(`breaks_policy = ${round2(answer.noul)}。規約違反を検出しました`)
          : fail(`breaks_policy = ${round2(answer.noul)}。もっとはっきり規約に反する文にしてみましょう`);
      },
    },
    docs: [
      { title: "Intent routing", url: `${DOCS}/patterns/intent-routing` },
      { title: "Guardrails for LLMs (cookbook)", url: `${DOCS}/cookbooks/llm_guardrails` },
      { title: "SDE cascade (cookbook)", url: `${DOCS}/cookbooks/sde_cascade` },
      { title: "Smart home assistant demo", url: `${DOCS}/demos/smart-home` },
    ],
  },
  {
    id: lessonId("ai-sdk"),
    part: "limits",
    title: "AI SDK と Gateway から使う",
    lead: "同じ Jev を Vercel AI Gateway 経由でも呼べる。名前と値の置き場所が少し違う。",
    body: `
Jev は Vercel AI Gateway からも使えます。
AI SDK 7 では \`experimental_evaluate\` を使い、モデル ID は \`typesafe-ai/jev\`、認証は \`AI_GATEWAY_API_KEY\` です。

\`\`\`ts
import { experimental_evaluate } from "ai";

const result = await experimental_evaluate({
  model: "typesafe-ai/jev",
  state: "Help! My payouts have been failing for 3 days.",
  questions: {
    is_urgent: { type: "boolean", instructions: "Does this message convey urgency?" },
  },
});

result.answers.is_urgent.probability; // TypeSafe API の noul にあたる
result.providerMetadata?.typesafe?.confidence; // Choice と Score の confidence（質問 ID ごと）
\`\`\`

## 名前の対応

| TypeSafe API | AI SDK |
| --- | --- |
| \`type: "noul"\` | \`type: "boolean"\` |
| 答えの \`noul\` | 答えの \`probability\` |
| 答えの \`confidence\` | \`providerMetadata.typesafe.confidence[質問ID]\` |
| 答えの \`legend\` | なし（criteria から自分で引く） |
| \`usage.input_tokens\` | \`usage.inputTokens\` |
| モデル \`jev-latest\` | \`typesafe-ai/jev\` |

## 環境変数の名前に注意

| 使い方 | 読む環境変数 |
| --- | --- |
| 公式 SDK（\`@typesafe-ai/sdk\`、\`typesafe-sdk\`） | \`TYPESAFE_API_KEY\` |
| AI SDK の TypeSafe プロバイダ（\`@ai-sdk/typesafe-ai\`） | \`TYPESAFE_AI_API_KEY\` |
| AI SDK の Gateway 経由 | \`AI_GATEWAY_API_KEY\`（\`vck_\` で始まる） |

## この教材での切り替え

画面上部の「経路」を Vercel AI Gateway にすると、\`jev()\` が Gateway 経由になります。
出力の「JSON を見る」で、上流に送った質問が \`boolean\` になっていることを確かめられます。
\`experimental_evaluate\` はまだ実験的な API で、パッチリリースでも変わることがあります。
`,
    code: aiSdkCode,
    docs: [
      { title: "AI SDK: experimental_evaluate", url: "https://ai-sdk.dev/docs/reference/ai-sdk-core/evaluate" },
      {
        title: "Vercel changelog: Jev on AI Gateway",
        url: "https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway",
      },
      { title: "Client SDKs", url: `${DOCS}/sdk` },
    ],
  },
];
