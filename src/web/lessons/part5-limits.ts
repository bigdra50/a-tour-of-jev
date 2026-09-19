import { evaluatedCalls, fail, notRunYet, pass, round2 } from "./checks.ts";
import aiSdkEn from "./code/en/ai-sdk.js" with { type: "text" };
import jaggednessEn from "./code/en/jaggedness.js" with { type: "text" };
import japaneseEn from "./code/en/japanese.js" with { type: "text" };
import vsLlmEn from "./code/en/vs-llm.js" with { type: "text" };
import withLlmEn from "./code/en/with-llm.js" with { type: "text" };
import aiSdkJa from "./code/ja/ai-sdk.js" with { type: "text" };
import jaggednessJa from "./code/ja/jaggedness.js" with { type: "text" };
import japaneseJa from "./code/ja/japanese.js" with { type: "text" };
import vsLlmJa from "./code/ja/vs-llm.js" with { type: "text" };
import withLlmJa from "./code/ja/with-llm.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

export const limits: readonly Lesson[] = [
  {
    id: lessonId("jaggedness"),
    part: "limits",
    title: { ja: "苦手なこと", en: "What Jev is bad at" },
    lead: {
      ja: "数える・計算する・日付を比べる・文章を書く。苦手なことはコードや別のモデルに任せる。",
      en: "Counting, calculating, comparing dates, and writing text. Leave what Jev is bad at to code or another model.",
    },
    body: {
      ja: `
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
      en: `
TypeSafe publishes what jev-1.13 is bad at as its jaggedness (the unevenness of its abilities).

| What it is bad at | What to do instead |
| --- | --- |
| Reads only what is literally written | State conditions precisely and put borderline examples in criteria |
| Arithmetic and counting | Do arithmetic in code. To count, ask about each item and add them up in code |
| The order of dates and the gaps between them | Extract the year, month, and day with Choice, and compare them in code |
| Multi-hop references and double negatives | Reduce the hops and point to places in the state by name |
| A state full of unrelated information | Narrow it down before passing it in |
| Inputs designed to mislead | Write clear criteria and test borderline cases in advance |
| Mismatch between instructions and criteria | Use the same words in both |
| Structural relationships (such as probabilities adding up) | Ask each judgment in one way only, and enforce relationships in code |
| Writing text | Use a generative model |

## Counting

jev-1.13 cannot reliably count the letters in a word or the entries in a list.
It only recognizes the "shape" of the answer, and the larger the target, the larger the error.
If a regular expression or a parser can find it, you do not need a model at all.
To count the things that match a condition, ask one question per candidate and add them up in code.

The code on the right compares both approaches with the fruit example from the documentation.

## Turn extraction into "choosing"

Jev does not generate text.
To pull out a value, create candidates with a regular expression or a generative model, and have Jev choose the right one among them.
For dates, use small Choices such as the month (12 options) or the day (31 options), and include a "not stated" option.
Do the assembling and comparing in code.
`,
    },
    code: { ja: jaggednessJa, en: jaggednessEn },
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
    title: { ja: "日本語で使う", en: "Using Japanese" },
    lead: {
      ja: "Jev の主な学習言語は英語。日本語も読めるが精度は下がるので、自分のデータで確かめる。",
      en: "Jev's main training language is English. It also reads Japanese, but less accurately, so test it on your own data.",
    },
    body: {
      ja: `
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
      en: `
The documentation's Models page says the following.

- The main training language is English, and English is also where accuracy is highest
- CJK (Chinese, Japanese, and Korean), including Japanese, is supported, but not at the same accuracy as English
- If you use a language other than English, test it on your own content before relying on it. When routing, watch confidence closely

## How to compare

The code on the right evaluates the same support ticket in three combinations, using Japanese as the non-English language.

- English state and English questions
- Japanese state and Japanese questions
- Japanese state, with only the questions (instructions and criteria) in English

Compare not only the chosen option but also \`confidence\`, the probability distribution, and the number of input tokens.
A simple example may show no difference.
The difference is easier to see with a message that could go either way (for example, a shipment is late and the customer is also considering a refund).

Before you use Jev on Japanese input in real work, measure its accuracy on Japanese data with known correct labels.
`,
    },
    code: { ja: japaneseJa, en: japaneseEn },
    docs: [{ title: "Models: language support", url: `${DOCS}/models#language-support` }],
  },
  {
    id: lessonId("vs-llm"),
    part: "limits",
    title: { ja: "小型 LLM と比べる", en: "Comparing with a small LLM" },
    lead: {
      ja: "同じ質問を小型 LLM にも答えさせ、速さ・費用・答えの形を比べる。",
      en: "Have a small LLM answer the same questions, and compare speed, cost, and the shape of the answers.",
    },
    requires: "llm",
    body: {
      ja: `
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
      en: `
Vercel's AI SDK can have an LLM answer questions in the same shape as Jev's (choice, score, boolean).
\`llm.evaluate()\` in the code on the right uses it to call a small LLM through Vercel AI Gateway.

## What is different

| Aspect | Jev | LLM (the AI SDK's evaluation adapter) |
| --- | --- | --- |
| Choice and Score answers | The chosen answer + the probability of every option + confidence | Only the chosen answer (no distribution) |
| Noul value | A probability trained with calibration as a goal | A number it gives when asked to "estimate a probability". Calibration is not guaranteed |
| How questions are handled | Each question is evaluated independently and in parallel | All questions are answered in a single prompt |
| Output tokens | Free | Billed |

Calibration means that, of all the answers given as 0.8, about 80% turn out to be right.
The documentation says this property matters when you set thresholds.

## What to look at

- Compare "ms", "cost USD", and "output tokens" in the table
- Open "View JSON" in the output to see the prompt actually sent to the LLM. Questions are replaced with internal codes like \`q0\`, and options with codes like \`c0\`
- Run it several times and compare how the answers vary (the earlier lesson "Asking the same question again")

This lesson needs a Vercel AI Gateway key (\`AI_GATEWAY_API_KEY\`).
You can change the LLM to compare with \`LLM_MODEL\` in the code.
If you omit \`model\` in \`llm.evaluate()\`, it uses the model selected in "Comparison LLM" at the top of the screen.
`,
    },
    code: { ja: vsLlmJa, en: vsLlmEn },
    exercise: {
      goal: {
        ja: "Jev と LLM をそれぞれ 5 回以上呼んで、`refund_requested` のばらつき（標準偏差）を比べましょう。",
        en: "Call Jev and the LLM at least 5 times each, and compare how much `refund_requested` varies (its standard deviation).",
      },
      hint: {
        ja: "`Promise.all` で 5 回ずつ呼び、`stdev()` で標準偏差を出します。",
        en: "Call each one 5 times with `Promise.all`, and compute the standard deviation with `stdev()`.",
      },
      check: (run) => {
        const jevCount = evaluatedCalls(run, "jev").length;
        const llmCount = evaluatedCalls(run, "llm-evaluate").length;
        if (jevCount + llmCount === 0) return notRunYet;
        return jevCount >= 5 && llmCount >= 5
          ? pass({
              ja: `Jev ${jevCount} 回、LLM ${llmCount} 回。標準偏差を比べてみましょう`,
              en: `Jev ${jevCount} times, LLM ${llmCount} times. Now compare the standard deviations.`,
            })
          : fail({
              ja: `今は Jev ${jevCount} 回、LLM ${llmCount} 回です`,
              en: `So far: Jev ${jevCount} times, LLM ${llmCount} times.`,
            });
      },
    },
    docs: [
      { title: "AI SDK: Evaluation", url: "https://ai-sdk.dev/docs/ai-sdk-core/evaluation" },
      {
        title: { ja: "AI primer（RLCD と較正）", en: "AI primer (RLCD and calibration)" },
        url: `${DOCS}/introduction/machine-learning-primer`,
      },
    ],
  },
  {
    id: lessonId("with-llm"),
    part: "limits",
    title: { ja: "LLM と組み合わせる", en: "Combining with an LLM" },
    lead: {
      ja: "Jev が速く安く振り分けと検査を受け持ち、文章が要るところだけ LLM を呼ぶ。",
      en: "Let Jev handle routing and checking quickly and cheaply, and call an LLM only where you need text.",
    },
    requires: "llm",
    body: {
      ja: `
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
      en: `
Jev returns only judgments and does not write text.
When you need text written, combine it with an LLM.

| Role | Good for |
| --- | --- |
| Jev | Classification, scoring, yes/no. Probabilities and confidence. Most requests take about 100 ms |
| LLM | Writing replies and summaries, free-form extraction, multi-step reasoning |

## Combinations from the documentation

- **Intent routing**: Jev classifies a request and decides whether it goes to fixed logic, a specialized LLM, or a person. Use expensive LLMs only for the requests that need them
- **Guardrails**: check what goes into an LLM and what comes out of it with Jev Nouls (jailbreaks, dangerous requests, policy violations, and so on)
- **Extraction cascade**: extract with a small LLM, have Jev check each field for "does this look wrong?", and send only the suspicious ones to a large reasoning model
- **Choosing from candidates**: a regular expression or an LLM produces candidates, and Jev picks the right one
- **Smart home demo**: a Noul decides whether a request contains several actions, and if it does, an LLM splits it into single actions before Jev evaluates them. Small talk is left to the LLM

## Should you combine Jev with a small LLM?

Yes, if you need to generate text.
If judgments are all you need, Jev alone is enough.
There are two basic patterns.

- Check what an LLM produces with Jev
- When Jev's confidence is low, hand off to an LLM or a person

The code on the right has three stages: routing (Jev) → writing a reply (LLM) → checking the reply (Jev).
Look at "ms" in the output to see which stage takes the time.
`,
    },
    code: { ja: withLlmJa, en: withLlmEn },
    exercise: {
      goal: {
        ja: '検査の `reply` に規約違反の文（例: "We will refund you $500 right away."）を直接入れて、`breaks_policy` が 0.5 を超えるか確かめましょう。',
        en: 'Put a sentence that breaks the policy (for example, "We will refund you $500 right away.") directly into `reply` in the check, and see whether `breaks_policy` goes above 0.5.',
      },
      hint: {
        ja: "`reply: draft.text` を、規約違反の文字列に置き換えます。",
        en: "Replace `reply: draft.text` with a string that breaks the policy.",
      },
      check: (run) => {
        const call = evaluatedCalls(run).findLast((c) => "breaks_policy" in c.answers);
        const answer = call?.answers.breaks_policy;
        if (answer?.type !== "noul") return notRunYet;
        const value = round2(answer.noul);
        return answer.noul > 0.5
          ? pass({
              ja: `breaks_policy = ${value}。規約違反を検出しました`,
              en: `breaks_policy = ${value}. The policy violation was detected.`,
            })
          : fail({
              ja: `breaks_policy = ${value}。もっとはっきり規約に反する文にしてみましょう`,
              en: `breaks_policy = ${value}. Try a sentence that breaks the policy more clearly.`,
            });
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
    title: { ja: "AI SDK と Gateway から使う", en: "Using the AI SDK and Gateway" },
    lead: {
      ja: "同じ Jev を Vercel AI Gateway 経由でも呼べる。名前と値の置き場所が少し違う。",
      en: "You can call the same Jev through Vercel AI Gateway. A few names differ, and some values live in different places.",
    },
    body: {
      ja: `
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
      en: `
Jev is also available through Vercel AI Gateway.
In AI SDK 7, use \`experimental_evaluate\` with the model ID \`typesafe-ai/jev\`, and authenticate with \`AI_GATEWAY_API_KEY\`.

\`\`\`ts
import { experimental_evaluate } from "ai";

const result = await experimental_evaluate({
  model: "typesafe-ai/jev",
  state: "Help! My payouts have been failing for 3 days.",
  questions: {
    is_urgent: { type: "boolean", instructions: "Does this message convey urgency?" },
  },
});

result.answers.is_urgent.probability; // the noul of the TypeSafe API
result.providerMetadata?.typesafe?.confidence; // confidence of Choice and Score (per question ID)
\`\`\`

## Name mapping

| TypeSafe API | AI SDK |
| --- | --- |
| \`type: "noul"\` | \`type: "boolean"\` |
| \`noul\` in the answer | \`probability\` in the answer |
| \`confidence\` in the answer | \`providerMetadata.typesafe.confidence[questionId]\` |
| \`legend\` in the answer | None (look it up in your criteria yourself) |
| \`usage.input_tokens\` | \`usage.inputTokens\` |
| Model \`jev-latest\` | \`typesafe-ai/jev\` |

## Watch the environment variable names

| How you call it | Environment variable it reads |
| --- | --- |
| Official SDKs (\`@typesafe-ai/sdk\`, \`typesafe-sdk\`) | \`TYPESAFE_API_KEY\` |
| The AI SDK's TypeSafe provider (\`@ai-sdk/typesafe-ai\`) | \`TYPESAFE_AI_API_KEY\` |
| The AI SDK through the Gateway | \`AI_GATEWAY_API_KEY\` (starts with \`vck_\`) |

## Switching in this tutorial

Set "Route" at the top of the screen to Vercel AI Gateway, and \`jev()\` goes through the Gateway.
Open "View JSON" in the output to confirm that the questions sent upstream became \`boolean\`.
\`experimental_evaluate\` is still an experimental API and can change even in a patch release.
`,
    },
    code: { ja: aiSdkJa, en: aiSdkEn },
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
