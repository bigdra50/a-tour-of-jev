import { evaluatedCalls, fail, lastTable, notRunYet, pass } from "./checks.ts";
import compositeEn from "./code/en/composite.js" with { type: "text" };
import twoStepEn from "./code/en/two-step.js" with { type: "text" };
import workflowEn from "./code/en/workflow.js" with { type: "text" };
import compositeJa from "./code/ja/composite.js" with { type: "text" };
import twoStepJa from "./code/ja/two-step.js" with { type: "text" };
import workflowJa from "./code/ja/workflow.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

const LEAVES = [
  "Bike Bottles & Cages",
  "Helmets",
  "Bike Lights",
  "Tents",
  "Sleeping Bags",
  "Camp Cookware",
  "Water Bottles",
  "Travel Mugs",
  "Tumblers",
  "Pans",
  "Pots",
  "Bakeware",
];

export const workflow: readonly Lesson[] = [
  {
    id: lessonId("workflow"),
    part: "workflow",
    title: { ja: "コードがワークフローを持つ", en: "Your code owns the workflow" },
    lead: {
      ja: "制御の流れ・決まった規則・副作用はコードに置く。Jev は狭い判断だけを受け持つ。",
      en: "Keep control flow, fixed rules, and side effects in code. Jev handles only narrow judgments.",
    },
    body: {
      ja: `
ドキュメントは、ソフトウェアの作り方を 3 つに分けています。

| 作り方 | 流れを決めるもの | 特徴 |
| --- | --- | --- |
| 従来のソフトウェア | コード | 単純で確実な部品を組み合わせた決定木 |
| LLM エージェント | モデル | 次の一手をモデルが選ぶ。ループのたびに脱線の機会がある |
| AI を組み込んだソフトウェア | コード | 常識的な判断や非構造データの解釈が要る所だけモデルを使う |

TypeSafe が狙っているのは 3 つ目です。
Jev はコードを書かず、次の行動も選びません。

## 組み立ての手順

1. コードで決まることはコードで決める（期限切れの日数計算など）
2. 質問に必要な部分だけを state に入れる
3. 質問を 1 つの性質ごとに分ける
4. 同じ state への質問はまとめて 1 回で聞く
5. 答えの組み合わせと分岐はコードで書く
6. 確信が持てないときは、人や高価な推論モデルに回す

右のコードは、ドキュメントにある問い合わせの振り分け（\`triage_ticket\`）を短くしたものです。
「閉じたチケットはモデルを呼ばない」「資格情報を求めるものは隔離」「分類の confidence が低ければ人へ」が、すべて普通の \`if\` で書かれています。
`,
      en: `
The documentation sorts ways of building software into three kinds.

| Approach | What decides the flow | Characteristics |
| --- | --- | --- |
| Traditional software | Code | A decision tree built from simple, reliable parts |
| LLM agents | The model | The model picks the next move. Every loop is another chance to go off track |
| Software with AI built in | Code | Uses a model only where common-sense judgment or reading unstructured data is needed |

TypeSafe is aiming at the third kind.
Jev does not write code, and it does not choose the next action.

## How to put it together

1. Decide in code whatever code can decide (such as counting the days until an expiry date)
2. Put only what the questions need into the state
3. Split the questions so that each one asks about a single property
4. Ask all the questions about the same state in a single call
5. Write the combining of answers and the branching in code
6. When you are not confident, hand off to a person or to a more expensive reasoning model

The code on the right is a shortened version of the ticket triage (\`triage_ticket\`) from the documentation.
"Do not call the model for closed tickets", "Quarantine anything that asks for credentials", and "Send it to a person when the topic confidence is low" are all written as ordinary \`if\` statements.
`,
    },
    code: { ja: workflowJa, en: workflowEn },
    exercise: {
      goal: {
        ja: "パスワードを聞き出そうとするチケットを `tickets` に足して、`quarantine` に振り分けられるか確かめましょう。",
        en: "Add a ticket to `tickets` that tries to get the recipient to reveal a password, and check whether it is routed to `quarantine`.",
      },
      hint: {
        ja: '例: "Your account is locked. Reply with your password so we can unlock it."',
        en: 'Example: "Your account is locked. Reply with your password so we can unlock it."',
      },
      check: (run) => {
        const table = lastTable(run);
        if (!table) return notRunYet;
        return table.some((row) => row.action === "quarantine")
          ? pass({
              ja: "資格情報を求めるチケットが隔離されました",
              en: "The ticket asking for credentials was quarantined.",
            })
          : fail({
              ja: "まだ quarantine に振り分けられたチケットがありません",
              en: "No ticket has been routed to quarantine yet.",
            });
      },
    },
    docs: [
      { title: "How to build with TypeSafe", url: `${DOCS}/concepts/how-to-build-with-system-one` },
      { title: "Patterns", url: `${DOCS}/patterns` },
    ],
  },
  {
    id: lessonId("composite"),
    part: "workflow",
    title: { ja: "重みをつけて合成する", en: "Weighted composites" },
    lead: {
      ja: "複雑な判断は軸ごとの Score に分け、0〜1 にそろえてから重みをかける。重みはコードが持つ。",
      en: "Split a complex judgment into one Score per dimension, scale each to 0 to 1, then apply weights. The weights live in code.",
    },
    body: {
      ja: `
いくつもの観点をまとめて 1 つの順位をつけたいとき、1 つの質問で「優先度は？」と聞くのではなく、観点ごとの Score に分けます（Composite scoring）。

## そろえてから足す

レベル数の違う Score をそのまま足すと、レベルの多い方が合計を大きく左右してしまいます。
3 レベルなら 0〜2、4 レベルなら 0〜3 なので、\`score / (レベル数 - 1)\` で 0〜1 にそろえてから重みをかけます。

ドキュメントの例では、優先度を次のように計算しています。

\`0.6 × 深刻度 + 0.3 × 不満度 + 0.1 × 報告の質\`

## 重みはコードの定数

- 並び順がチームの判断と合わなければ、プロンプトではなく重みを変える
- 各観点の値が残るので、合計がなぜその値になったかを説明できる
- 観点を足したくなったら、質問を 1 つ足すだけ。リクエストは 1 回のまま

同じ考え方で、候補者の評価（技術の深さ、リーダーシップ、設計力）のように、役割ごとに重みを変える使い方も紹介されています。
`,
      en: `
To rank items by several aspects at once, do not ask a single question like "What's the priority?".
Split it into one Score per aspect instead (Composite scoring).

## Normalize, then add

If you add up Scores with different numbers of levels as they are, the one with more levels sways the total the most.
A 3-level Score runs from 0 to 2 and a 4-level one from 0 to 3, so scale each to 0 to 1 with \`score / (number of levels - 1)\` before applying the weights.

The documentation's example computes priority like this.

\`0.6 × severity + 0.3 × frustration + 0.1 × report quality\`

## Weights are constants in code

- If the order does not match your team's judgment, change the weights, not the prompt
- The value for each aspect is kept, so you can explain why the total came out the way it did
- To add an aspect, add one more question. It is still a single request

The documentation also applies the same idea to evaluating candidates (technical depth, leadership, design skills), with different weights for each role.
`,
    },
    code: { ja: compositeJa, en: compositeEn },
    exercise: {
      goal: {
        ja: "`WEIGHTS` だけを変えて、PDF 書き出しの報告がログイン障害より上に来るようにしましょう（見た目のずれの報告は最下位のまま）。",
        en: "Change only `WEIGHTS` so that the PDF export report ranks above the login outage (keep the cosmetic misalignment report at the bottom).",
      },
      hint: {
        ja: "PDF の報告は不満度と報告の質が高く、ログイン障害は深刻度が高い、という違いがあります。",
        en: "The PDF report is high on frustration and report quality, while the login outage is high on severity.",
      },
      check: (run) => {
        const table = lastTable(run);
        if (!table || table.length < 3) return notRunYet;
        const names = table.map((row) => String(row.ticket ?? ""));
        const pdf = names.findIndex((t) => t.startsWith("Export to PDF"));
        const login = names.findIndex((t) => t.startsWith("Nobody on our team"));
        const icon = names.findIndex((t) => t.startsWith("The export icon"));
        if (pdf < 0 || login < 0 || icon < 0) {
          return fail({
            ja: "3 つのチケットは変えずに、重みだけを変えてください",
            en: "Keep the three tickets as they are and change only the weights.",
          });
        }
        if (icon !== names.length - 1) {
          return fail({
            ja: "見た目のずれの報告が最下位ではなくなりました",
            en: "The cosmetic misalignment report is no longer at the bottom.",
          });
        }
        return pdf < login
          ? pass({
              ja: "PDF の報告がログイン障害より上に来ました",
              en: "The PDF report now ranks above the login outage.",
            })
          : fail({ ja: "まだログイン障害の方が上です", en: "The login outage still ranks higher." });
      },
    },
    docs: [
      { title: "Composite scoring", url: `${DOCS}/patterns/composite-scoring` },
      {
        title: "Splitting a complex judgment into several Scores",
        url: `${DOCS}/primitives/score#splitting-a-complex-judgment-into-several-score-questions`,
      },
    ],
  },
  {
    id: lessonId("two-step"),
    part: "workflow",
    title: { ja: "2 回に分けるとき", en: "When to split into two calls" },
    lead: {
      ja: "次のリクエストを作るのに前の答えが要るときだけ、呼び出しを分ける。",
      en: "Split into separate calls only when you need an earlier answer to build the next request.",
    },
    body: {
      ja: `
同じリクエストの質問はそれぞれ独立に評価されます。
ある質問の答えを、別の質問の文脈として使うことはできません。

## 分けるのは本当に必要なときだけ

2 回目の呼び出しが必要なのは、前の答えを使わないと次のリクエストを作れないときです。

- 前の答えを見て、state に入れるデータを取りに行く
- 前の答えを見て、次に出す選択肢を決める

そうでなければ、最初のリクエストに全部入れて、要らない答えはコードで捨てます（並列質問と投機）。

## 例：階層をたどる分類

右のコードは、商品を「部門 → カテゴリ」の順に分類します。
2 回目の選択肢は 1 回目で選んだ部門の子なので、1 回目の答えがないと作れません。

- 選択肢の説明に部分木（その下のカテゴリ）を入れると、枝の下に何があるかをモデルが見て選べる
- 自転車用ボトルは「スポーツ用品 > 自転車」と「台所用品 > 飲料容器」のどちらにも入りうる。部分木が見えていると、この迷いが確率に表れる
- 確率が近いときは両方の枝をたどる（ビームサーチ）。ドキュメントのクックブックで詳しく扱っている
`,
      en: `
The questions in one request are each evaluated independently.
You cannot use the answer to one question as context for another.

## Split only when you really have to

You need a second call only when you cannot build the next request without the earlier answer.

- You look at the earlier answer and go fetch data to put in the state
- You look at the earlier answer and decide which options to offer next

Otherwise, put everything in the first request and throw away the answers you do not need in code (Parallel and speculative questions).

## Example: classifying down a hierarchy

The code on the right classifies a product in the order "department → category".
The options for the second call are the children of the department picked in the first call, so you cannot build them without the first answer.

- If you put the subtree (the categories below it) in each option's description, the model can see what lies under each branch as it chooses
- A bike bottle could belong to either "Sporting Goods > Cycling" or "Home & Kitchen > Drinkware". When the subtrees are visible, this uncertainty shows up in the probabilities
- When the probabilities are close, follow both branches (beam search). The documentation's cookbook covers this in detail
`,
    },
    code: { ja: twoStepJa, en: twoStepEn },
    exercise: {
      goal: {
        ja: "3 回目の呼び出しを足して、葉（例: Bike Bottles & Cages）まで下りましょう。",
        en: "Add a third call and go all the way down to a leaf (for example, Bike Bottles & Cages).",
      },
      hint: {
        ja: "2 回目で選んだカテゴリの配列を、Choice の選択肢（{ 名前: null }）に変えて渡します。",
        en: "Turn the array for the category picked in the second call into Choice options ({ name: null }) and pass them in.",
      },
      check: (run) => {
        const calls = evaluatedCalls(run);
        if (calls.length === 0) return notRunYet;
        const reachedLeaf = calls.some((call) =>
          Object.values(call.answers).some((a) => a.type === "choice" && LEAVES.includes(a.choice)),
        );
        return calls.length >= 3 && reachedLeaf
          ? pass({ ja: "葉までたどり着きました", en: "You made it down to a leaf." })
          : fail({
              ja: `呼び出しは ${calls.length} 回です。葉のカテゴリを選ぶ呼び出しを足しましょう`,
              en: `Calls so far: ${calls.length}. Add a call that picks a leaf category.`,
            });
      },
    },
    docs: [
      { title: "When one question depends on another", url: `${DOCS}/primitives#when-one-question-depends-on-another` },
      { title: "Hierarchical classification (cookbook)", url: `${DOCS}/cookbooks/hierarchical_classification` },
    ],
  },
];
