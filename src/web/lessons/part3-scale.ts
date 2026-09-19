import { evaluatedCalls, fail, lastTable, notRunYet, pass } from "./checks.ts";
import confidenceEn from "./code/en/confidence.js" with { type: "text" };
import consistencyEn from "./code/en/consistency.js" with { type: "text" };
import fanoutEn from "./code/en/fanout.js" with { type: "text" };
import tokensEn from "./code/en/tokens.js" with { type: "text" };
import confidenceJa from "./code/ja/confidence.js" with { type: "text" };
import consistencyJa from "./code/ja/consistency.js" with { type: "text" };
import fanoutJa from "./code/ja/fanout.js" with { type: "text" };
import tokensJa from "./code/ja/tokens.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

export const scale: readonly Lesson[] = [
  {
    id: lessonId("fanout"),
    part: "scale",
    title: { ja: "並列質問と投機", en: "Parallel and speculative questions" },
    lead: {
      ja: "要りそうな質問は全部 1 回で聞く。質問は並列に評価されるので、増やしても遅くならない。",
      en: "Ask every question you might need in one call. Questions are evaluated in parallel, so adding more does not slow things down.",
    },
    body: {
      ja: `
1 回のリクエストに入れた質問は、すべて並列かつ独立に評価されます。
質問を足しても、応答時間はほとんど変わりません。

## 投機的な質問（Speculative fan-out）

「まず分類して、バグ報告なら次に深刻度を聞く」と順番に聞くのはやめます。
結果次第で要らなくなる質問も最初から全部入れておき、どれを使うかはコードが決めます。
これをドキュメントは Speculative fan-out と呼んでいます。

- バグ報告でなければ \`bug_severity\` の答えを読まずに捨てる
- 捨てた質問の分もトークンは払うが、往復を 1 回減らせる
- 答えは質問ごとに独立なので、質問を足しても他の答えは変わらない

## 1 問ずつ聞くと何が起きるか

1 問ずつ N 回呼ぶと、state を N 回送ることになり、往復も N 回かかります。
まとめれば state は 1 回分で済みます。
ドキュメントの実験（GDPR の記事に 13 問）では、まとめた方が 12.2 倍安く、10.0 倍速く、答えは変わりませんでした。
state が長いほど、この差は N 倍に近づきます。

右のコードで、まとめた場合と 1 問ずつの場合を比べてみてください。
前の答えがないと次のリクエストを作れないときだけ、呼び出しを分けます（後のレッスン「2 回に分けるとき」）。
`,
      en: `
All the questions in one request are evaluated in parallel and independently.
Adding questions barely changes the response time.

## Speculative fan-out

Stop asking step by step, as in "first classify it, and if it is a bug report, then ask how severe it is".
Put in every question from the start, even ones the result may make unnecessary, and let your code decide which answers to use.
The documentation calls this speculative fan-out.

- If it is not a bug report, throw away the \`bug_severity\` answer without reading it
- You pay tokens for the questions you throw away, but you save a round trip
- Each answer is independent, so adding questions does not change the other answers

## What happens if you ask one question at a time

Calling N times with one question each means sending the state N times and making N round trips.
Batching them means sending the state only once.
In the documentation's experiment (13 questions about a GDPR article), batching was 12.2 times cheaper and 10.0 times faster, and the answers did not change.
The longer the state, the closer this gap gets to N times.

In the code on the right, compare asking everything at once with asking one question at a time.
Split calls only when you cannot build the next request without the previous answer (the later lesson "When to split into two calls").
`,
    },
    code: { ja: fanoutJa, en: fanoutEn },
    exercise: {
      goal: {
        ja: "まとめて聞く `questions` に質問を 1 つ足して（例: 使っているブラウザを選ぶ Choice）、時間がほとんど変わらないことを確かめましょう。",
        en: "Add one more question to the batched `questions` (for example, a Choice for which browser is used) and confirm that the time barely changes.",
      },
      check: (run) => {
        const calls = evaluatedCalls(run);
        if (calls.length === 0) return notRunYet;
        const biggest = Math.max(...calls.map((call) => Object.keys(call.questions).length));
        return biggest >= 6
          ? pass({
              ja: `${biggest} 問を 1 回で聞けました。表の「ミリ秒」を前回と比べてみましょう`,
              en: `Asked ${biggest} questions in one call. Compare the "ms" column in the table with the previous run.`,
            })
          : fail({
              ja: `まとめた呼び出しの質問は ${biggest} 問です。6 問以上にしてみましょう`,
              en: `The batched call has ${biggest} questions. Try 6 or more.`,
            });
      },
    },
    docs: [
      { title: "Speculative fan-out", url: `${DOCS}/patterns/fan-out` },
      { title: "Parallel questions (cookbook)", url: `${DOCS}/cookbooks/parallel_questions` },
    ],
  },
  {
    id: lessonId("confidence"),
    part: "scale",
    title: { ja: "confidence で分岐する", en: "Branching on confidence" },
    lead: {
      ja: "答えは「何を」、confidence は「任せてよいか」を教える。しきい値はリスクで変える。",
      en: 'The answer tells you "what", and confidence tells you "whether to trust it". Set thresholds by risk.',
    },
    body: {
      ja: `
Choice と Score の答えには \`confidence\`（0〜1）がつきます。
\`probabilities\` の分布が 1 か所に集中していれば高く、平らに散らばっていれば低くなります。
Noul には confidence がありません。
0.5 に近いほど迷っていると読みます。

## 3 つの段階で考える

- 高い：自動で進める
- 中くらい：確認する、レビューに回す、情報を足してから判断する
- 低い：進めない。人間や別の仕組みに回す

## しきい値は 1 つではない

取り消せない操作ほど高い confidence を求めます。
右のコードは、ドキュメントにある音声バンキングの例です。

- 0.6 未満はどの操作でもオペレーターへ
- 残高の読み上げは 0.6 で十分（間違っても害が小さい）
- 送金の承認は 0.85 を超えたときだけ実行し、それ以外は確認する

## 注意

- confidence は、その答えが正しいという保証ではない。自分のデータで confidence と正答率の関係を見てしきい値を決める
- いちばん確率の高い選択肢を選ぶだけなら、しきい値は要らない
- \`confidence\` は分布から計算した便利な指標のひとつ。別の指標が必要なら \`probabilities\` から自分で計算できる
`,
      en: `
Choice and Score answers come with a \`confidence\` (0 to 1).
It is high when the \`probabilities\` distribution is concentrated in one place, and low when it is spread out flat.
Noul has no confidence.
Read a value close to 0.5 as the model being unsure.

## Think in three tiers

- High: proceed automatically
- Medium: confirm, send it to review, or add information before deciding
- Low: do not proceed. Hand it off to a person or another system

## There is more than one threshold

The harder an action is to undo, the higher the confidence it requires.
The code on the right is the voice banking example from the documentation.

- Below 0.6, hand off to an operator for every action
- Reading out the balance only needs 0.6 (a mistake does little harm)
- Approve a transfer only when confidence is above 0.85, and ask for confirmation otherwise

## Caveats

- confidence does not guarantee that the answer is correct. Check how confidence relates to accuracy on your own data before setting thresholds
- If you only pick the option with the highest probability, you do not need a threshold
- \`confidence\` is one convenient measure computed from the distribution. If you need a different measure, you can compute it yourself from \`probabilities\`
`,
    },
    code: { ja: confidenceJa, en: confidenceEn },
    exercise: {
      goal: {
        ja: "`utterances` に発話を足したり書き換えたりして、表の「行動」に 4 種類すべて（読み上げ・実行・確認・オペレーター）が出るようにしましょう。",
        en: "Add or rewrite utterances in `utterances` so that all four kinds (read out, execute, confirm, operator) appear in the `action` column of the table.",
      },
      hint: {
        ja: "送金を頼んでいるようで曖昧な発話や、銀行と関係のない発話を試してみます。",
        en: "Try an utterance that seems to ask for a transfer but is vague, or one that has nothing to do with banking.",
      },
      check: (run) => {
        const table = lastTable(run);
        if (!table) return notRunYet;
        // 英語版の初期コードでは、行動の列名が action になる
        const kinds = new Set(table.map((row) => row.行動 ?? row.action).filter((v) => typeof v === "string"));
        return kinds.size >= 4
          ? pass({ ja: "4 種類の行動がすべて出ました", en: "All four kinds of action appeared." })
          : fail({
              ja: `今は ${kinds.size} 種類（${[...kinds].join("、")}）です`,
              en: `Right now there are ${kinds.size} kinds (${[...kinds].join(", ")}).`,
            });
      },
    },
    docs: [
      { title: "Confidence", url: `${DOCS}/confidence` },
      { title: "Confidence-gated routing", url: `${DOCS}/patterns/confidence-routing` },
    ],
  },
  {
    id: lessonId("consistency"),
    part: "scale",
    title: { ja: "同じ質問を何度も聞く", en: "Asking the same question again" },
    lead: {
      ja: "Jev は繰り返しても安定した答えを返すよう作られている。10 回聞いてばらつきを測る。",
      en: "Jev is built to give stable answers when asked repeatedly. Ask 10 times and measure the spread.",
    },
    body: {
      ja: `
System One は、同じ入力に対して毎回ほぼ同じ答えを返すように作られています（self-consistency）。
ばらつきが小さいと、しきい値を決めたときの振る舞いが読みやすくなります。

## ドキュメントの実験

自動車保険の請求 1 件に 14 問の Noul を当て、それを 15 回繰り返した実験があります。

- Jev の、質問ごとの標準偏差の平均は 0.0102 だった
- 比べた LLM（温度 0 を含む）のどの条件よりも小さかった
- それでも、ある質問は 0.43〜0.53 の間で揺れ、0.5 のしきい値をまたいだ
- そこで 0.30〜0.70 を「保留」として人のレビューに回す設計が紹介されている

ばらつきが小さくても、しきい値のすぐ近くでは結論が入れ替わることがあります。
しきい値のまわりに「保留」の幅をとっておくと安全です。

公式の実験では、毎回 state に使い捨ての \`uid\` を入れて、1 回ごとに別のリクエストになるようにしています。
右のコードも同じようにしています。
`,
      en: `
System One is built to return almost the same answer every time for the same input (self-consistency).
When the spread is small, it is easier to predict how things behave once you set a threshold.

## The documentation's experiment

In one experiment, 14 Noul questions were asked about a single auto insurance claim, and this was repeated 15 times.

- Jev's per-question standard deviation averaged 0.0102
- That was smaller than every setting of the LLMs it was compared with (including temperature 0)
- Even so, one question moved between 0.43 and 0.53, crossing the 0.5 threshold
- So the documentation shows a design that treats 0.30 to 0.70 as "hold" and sends those cases to human review

Even with a small spread, the conclusion can flip right next to a threshold.
Leaving a "hold" band around the threshold is safer.

In the official experiment, a throwaway \`uid\` goes into the state every time so that each run is a separate request.
The code on the right does the same.
`,
    },
    code: { ja: consistencyJa, en: consistencyEn },
    docs: [
      { title: "Self-consistency: nouls", url: `${DOCS}/cookbooks/consistency_noul_cookbook` },
      { title: "Self-consistency: choices", url: `${DOCS}/cookbooks/consistency_choice_cookbook` },
    ],
  },
  {
    id: lessonId("tokens"),
    part: "scale",
    title: { ja: "トークンと費用", en: "Tokens and cost" },
    lead: {
      ja: "課金は入力トークンだけ。state は 1 回だけ数えられ、質問を足すとその分だけ増える。",
      en: "Only input tokens are billed. The state is counted once, and each question you add adds its own tokens.",
    },
    body: {
      ja: `
応答の \`usage\` に、入力と出力のトークン数が入っています。

## 料金と上限（jev-1.13）

| 項目 | 値 |
| --- | --- |
| 料金 | 入力 100 万トークンあたり 0.042 ドル。出力は無料 |
| 1 リクエストの上限 | 全体で 64k トークン。state と最長の質問で 32k トークン |
| レート制限 | 毎秒 25 万トークン、毎分 1,200 リクエスト（調整中で変わることがある） |

レート制限を超えると \`429\`、混雑しているときは \`529\` が返ります。
この教材のサーバーは、どちらも少し待ってから自動で再試行します。

## 何がトークンを増やすか

- state は 1 回だけ数えられる。質問がいくつあっても state の分は増えない
- 質問を足すと、その質問（instructions と criteria）の分だけ増える
- 同じ state への質問を 1 問ずつ別々に送ると、state の分を毎回払うことになる

画面の右上に、このタブで行った呼び出しの回数・入力トークン・費用の累計が出ます。
円の金額は 1 ドル = 150 円で換算した概算です。
`,
      en: `
The response's \`usage\` holds the input and output token counts.

## Pricing and limits (jev-1.13)

| Item | Value |
| --- | --- |
| Price | $0.042 per million input tokens. Output is free |
| Per-request limit | 64k tokens in total. 32k tokens for the state and the longest question |
| Rate limits | 250k tokens per second, 1,200 requests per minute (still being tuned, may change) |

Going over the rate limit returns \`429\`, and \`529\` comes back when the service is busy.
This tutorial's server waits a moment and retries automatically in both cases.

## What increases tokens

- The state is counted only once. No matter how many questions there are, the state's share does not grow
- Adding a question adds that question's tokens (its instructions and criteria)
- Sending questions about the same state one by one means paying for the state every time

The top right of the screen shows the running totals of calls, input tokens, and cost for this tab.
`,
    },
    code: { ja: tokensJa, en: tokensEn },
    docs: [
      { title: { ja: "Models（価格・上限）", en: "Models (pricing and limits)" }, url: `${DOCS}/models` },
      { title: "Handling rate limits", url: `${DOCS}/api#handling-rate-limits` },
    ],
  },
];
