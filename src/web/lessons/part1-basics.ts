import { fail, lastAnswer, lastCallWith, notRunYet, pass, round2 } from "./checks.ts";
import choiceEn from "./code/en/choice.js" with { type: "text" };
import helloEn from "./code/en/hello.js" with { type: "text" };
import noulEn from "./code/en/noul.js" with { type: "text" };
import scoreEn from "./code/en/score.js" with { type: "text" };
import typesEn from "./code/en/types.js" with { type: "text" };
import choiceJa from "./code/ja/choice.js" with { type: "text" };
import helloJa from "./code/ja/hello.js" with { type: "text" };
import noulJa from "./code/ja/noul.js" with { type: "text" };
import scoreJa from "./code/ja/score.js" with { type: "text" };
import typesJa from "./code/ja/types.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

export const basics: readonly Lesson[] = [
  {
    id: lessonId("hello"),
    part: "basics",
    title: { ja: "Hello Jev", en: "Hello Jev" },
    lead: {
      ja: "Jev は文章を書かない。state と質問を渡すと、型のついた答えと確率が返ってくる。",
      en: "Jev does not write text. Give it a state and questions, and it returns typed answers with probabilities.",
    },
    body: {
      ja: `
Jev は TypeSafe が作った **System One モデル** です。
LLM と同じように自然言語を読みますが、文章は生成しません。
渡すものは 2 つだけです。

- \`state\`：判断の材料（文章や JSON）
- \`questions\`：判断してほしいことを、型つきで並べたもの

返ってくるのは、質問ごとの型のついた答えと確率です。
右のコードを実行してみてください。
⌘ + Enter（Windows と Linux では Ctrl + Enter）でも実行できます。

\`noul(...)\` は yes/no で答える質問を作る関数です。
答えの \`noul\` は「yes である確率」で、0 から 1 の数になります。

## 何が起きたか

\`jev()\` はこの教材のサーバーを経由して \`POST https://api.typesafe.ai/v1/systemone\` を呼んでいます。
出力の「JSON を見る」を開くと、実際に送った本文と返ってきた本文を確認できます。

- 質問の ID（ここでは \`is_urgent\`）は答えを受け取るための名前で、モデルには送られません
- 応答の \`model\` には、エイリアス \`jev-latest\` が指している実際のバージョンが入ります
- \`usage\` は入力と出力のトークン数です。課金されるのは入力だけです

名前の由来は、カーネマンの『ファスト＆スロー』に出てくるシステム 1（速く直感的な思考）です。
人が一瞬で下せるような判断を、ソフトウェアから呼べる形で提供するのが Jev の役割です。

例文が英語なのは、Jev の主な学習言語が英語で、精度もいちばん高いからです。
日本語も読めますが精度は下がります。
これは後半のレッスン「日本語で使う」で確かめます。
`,
      en: `
Jev is a **System One model** built by TypeSafe.
It reads natural language like an LLM, but it does not generate text.
You give it only two things.

- \`state\`: the material to judge (text or JSON)
- \`questions\`: what you want judged, listed with their types

It returns a typed answer with probabilities for each question.
Run the code on the right.
You can also press ⌘ + Enter (Ctrl + Enter on Windows and Linux).

\`noul(...)\` creates a question answered with yes or no.
The answer's \`noul\` is the probability of "yes", a number from 0 to 1.

## What happened

\`jev()\` calls \`POST https://api.typesafe.ai/v1/systemone\` through this tutorial's server.
Open "View JSON" in the output to see the request body that was sent and the response body that came back.

- The question ID (\`is_urgent\` here) is only the name you read the answer by. It is not passed to the model
- The response's \`model\` holds the actual version that the alias \`jev-latest\` points to
- \`usage\` counts input and output tokens. Only input is billed

The name comes from System 1 (fast, intuitive thinking) in Kahneman's *Thinking, Fast and Slow*.
Jev's job is to offer the kind of judgment a person makes in an instant, in a form that software can call.

The examples are in English because English is Jev's main training language and the one it is most accurate in.
Jev also reads Japanese, but with lower accuracy.
You will see this for yourself in the later lesson "Using Japanese".
`,
    },
    code: { ja: helloJa, en: helloEn },
    exercise: {
      goal: {
        ja: "`state` を書き換えて、`is_urgent` が 0.2 を下回る文章にしてみましょう。",
        en: "Rewrite the `state` so that `is_urgent` drops below 0.2.",
      },
      hint: {
        ja: "急ぎの気配がない問い合わせにします。例えば、来月から請求書の送付先を変えたいという連絡です。",
        en: "Make it a message with no sense of urgency. For example, a note asking to change the invoice address starting next month.",
      },
      check: (run) => {
        const answer = lastAnswer(run, "is_urgent");
        if (answer?.type !== "noul") return notRunYet;
        const value = round2(answer.noul);
        return answer.noul < 0.2
          ? pass({
              ja: `is_urgent = ${value}。急ぎではないと判断されました`,
              en: `is_urgent = ${value}. Judged as not urgent.`,
            })
          : fail({
              ja: `is_urgent = ${value}。まだ急ぎに見えるようです`,
              en: `is_urgent = ${value}. It still reads as urgent.`,
            });
      },
    },
    docs: [
      { title: "Introduction", url: `${DOCS}/introduction` },
      { title: "System One", url: `${DOCS}/concepts/system-one` },
      { title: "API reference", url: `${DOCS}/api` },
    ],
  },
  {
    id: lessonId("noul"),
    part: "basics",
    title: { ja: "Noul は確率", en: "Noul is a probability" },
    lead: {
      ja: "Noul の値は yes である確率。0.5 は「中くらい」ではなく「五分五分」を表す。",
      en: 'A Noul value is the probability of yes. 0.5 means "a toss-up", not "medium".',
    },
    body: {
      ja: `
Noul は yes/no の質問です。
答えの \`noul\` は **yes である確率** で、1 に近いほど強い yes、0 に近いほど強い no、0.5 のあたりは判断がつかないことを表します。

## 0.5 は「中くらい」ではない

"Is this candidate strong in Python?" に 0.5 が返っても、「Python の腕前が中くらい」という意味にはなりません。
yes と no が同じくらいありそうだ、という意味です。
しかも「strong」の定義があいまいなので、確率の読み方もあいまいになります。
程度を測りたいときは Score を使います（2 つ先のレッスン）。

## 書き方のコツ

- 高い値が yes を意味するように書く。否定形の質問は避ける
- 質問の形でも、真偽を判定させる文（"The customer is asking for a refund."）の形でもよい
- yes と no の境目が微妙なときは、\`criteria\` で両方の意味を書く。\`noul(instructions, { true: "...", false: "..." })\`
- コードでは、しきい値を決めて真偽値に変える。\`if (a.noul >= 0.7) { ... }\`

右の問い合わせ「サイズが合わない、どうすればいい？」は、返金を求めているとも求めていないとも読めます。
3 つの書き方で値がどう変わるかを見てください。
Noul には Choice や Score のような \`confidence\` がありません。
確率そのものが確信の強さを表しているからです。
`,
      en: `
Noul is a yes/no question.
The answer's \`noul\` is **the probability of yes**: closer to 1 is a stronger yes, closer to 0 is a stronger no, and around 0.5 means the model cannot tell.

## 0.5 does not mean "medium"

If "Is this candidate strong in Python?" returns 0.5, it does not mean "medium Python skills".
It means yes and no look about equally likely.
And because "strong" is vague, the probability is just as vague to read.
To measure a degree, use Score (two lessons ahead).

## Tips for writing

- Write it so that a high value means yes. Avoid negative questions
- Both a question and a statement to judge true or false ("The customer is asking for a refund.") work
- When the line between yes and no is subtle, describe both sides with \`criteria\`: \`noul(instructions, { true: "...", false: "..." })\`
- In code, pick a threshold and turn the value into a boolean: \`if (a.noul >= 0.7) { ... }\`

The ticket on the right, "I'm not happy with the fit. What are my options here?", can be read either as a refund request or not.
See how the value changes across the three ways of writing the question.
Noul has no \`confidence\` like Choice and Score do.
The probability itself already expresses how sure the model is.
`,
    },
    code: { ja: noulJa, en: noulEn },
    exercise: {
      goal: {
        ja: "`ticket` をはっきり返金を求める文に書き換えて、3 つの答えがすべて 0.8 を超えるようにしましょう。",
        en: "Rewrite `ticket` as a clear refund request so that all three answers go above 0.8.",
      },
      hint: {
        ja: '例: "This doesn\'t fit. I want my money back for this order."',
        en: 'Example: "This doesn\'t fit. I want my money back for this order."',
      },
      check: (run) => {
        const call = lastCallWith(run, "asks_refund_defined");
        if (!call) return notRunYet;
        const values = Object.values(call.answers).flatMap((a) => (a.type === "noul" ? [a.noul] : []));
        const listed = values.map(round2).join(" / ");
        return values.length >= 3 && values.every((v) => v > 0.8)
          ? pass({ ja: `すべて 0.8 超え（${listed}）`, en: `All above 0.8 (${listed}).` })
          : fail({
              ja: `今の値: ${listed}。すべて 0.8 を超えるまで書き換えてみましょう`,
              en: `Current values: ${listed}. Keep rewriting until all of them are above 0.8.`,
            });
      },
    },
    docs: [
      { title: "Noul", url: `${DOCS}/primitives/noul` },
      { title: "Choose a question type", url: `${DOCS}/primitives#choose-a-question-type` },
    ],
  },
  {
    id: lessonId("choice"),
    part: "basics",
    title: { ja: "Choice と分布", en: "Choice and distributions" },
    lead: {
      ja: "決まった選択肢から 1 つ選ぶ。全選択肢の確率と confidence がついてくる。",
      en: "Pick one option from a fixed set. You also get the probability of every option and a confidence.",
    },
    body: {
      ja: `
Choice は、順序のない選択肢から 1 つを選ぶ質問です。
\`choice(instructions, { 選択肢名: 説明 })\` で作ります。

答えには 3 つの値が入ります。

- \`choice\`：いちばん確率の高い選択肢
- \`probabilities\`：すべての選択肢の確率。合計は 1
- \`confidence\`：確率がどれだけ 1 つの選択肢に集中しているか（0〜1）

## 選択肢の書き方

- 選択肢名と説明はどちらもモデルに送られる。説明は、選択肢どうしを区別するために書く
- 名前だけで意味が明らかなら、説明は \`null\` でよい
- 選択肢は最大 255 個。候補を絞らずに全部渡す
- どれにも当てはまらない入力がありうるなら \`other\` や \`none_of_the_above\` を入れる

## 2 番手の確率にも意味がある

右の問い合わせは「サイズ違い（returns）」と「二重請求（billing）」の両方を含みます。
こういうとき確率は 2 つに分かれ、\`confidence\` が下がります。
ドキュメントの例では、returns が 0.60、billing が 0.38 でした。
いちばん上だけで振り分けつつ、2 番手の確率が 0.25 を超えたらそのチームにも写しを送る、という使い方ができます。
`,
      en: `
Choice picks one option from a set of unordered options.
You create it with \`choice(instructions, { optionName: description })\`.

The answer holds three values.

- \`choice\`: the option with the highest probability
- \`probabilities\`: the probability of every option. They add up to 1
- \`confidence\`: how concentrated the probability is on a single option (0 to 1)

## Writing options

- Both the option names and their descriptions are sent to the model. Write descriptions that tell the options apart
- If the name alone makes the meaning clear, the description can be \`null\`
- You can have up to 255 options. Pass them all instead of narrowing them down first
- If an input might fit none of them, add \`other\` or \`none_of_the_above\`

## The runner-up probability means something too

The ticket on the right mentions both a wrong size (returns) and a double charge (billing).
In a case like this, the probability splits between the two and \`confidence\` drops.
In the documentation's example, returns got 0.60 and billing got 0.38.
You can route by the top option and also send a copy to the second team when its probability exceeds 0.25.
`,
    },
    code: { ja: choiceJa, en: choiceEn },
    exercise: {
      goal: {
        ja: "`ticket` を書き換えて、`department` に billing を confidence 0.8 以上で選ばせましょう。",
        en: "Rewrite `ticket` so that `department` picks billing with a confidence of 0.8 or higher.",
      },
      hint: {
        ja: '請求の話だけにします。例: "I was charged twice for my last order."',
        en: 'Make it only about billing. Example: "I was charged twice for my last order."',
      },
      check: (run) => {
        const answer = lastAnswer(run, "department");
        if (answer?.type !== "choice") return notRunYet;
        const confidence = round2(answer.confidence ?? 0);
        if (answer.choice !== "billing") {
          return fail({ ja: `今は ${answer.choice} が選ばれています`, en: `Right now ${answer.choice} is chosen.` });
        }
        return (answer.confidence ?? 0) >= 0.8
          ? pass({
              ja: `billing を confidence ${confidence} で選びました`,
              en: `Chose billing with confidence ${confidence}.`,
            })
          : fail({
              ja: `billing ですが confidence が ${confidence} です。ほかのチームの要素を減らしてみましょう`,
              en: `It is billing, but confidence is ${confidence}. Try removing details that point to other teams.`,
            });
      },
    },
    docs: [
      { title: "Choice", url: `${DOCS}/primitives/choice` },
      { title: "Confidence", url: `${DOCS}/confidence` },
    ],
  },
  {
    id: lessonId("score"),
    part: "basics",
    title: { ja: "Score と順序つきレベル", en: "Score and ordered levels" },
    lead: {
      ja: "低い順に並べたレベルのどこに当たるか。score はレベル番号の確率加重平均。",
      en: "Where the input falls on levels ordered from low to high. score is the probability-weighted average of the level numbers.",
    },
    body: {
      ja: `
Score は、段階を言葉で書けるスペクトラム上の位置を測る質問です。
\`score(instructions, [レベル0, レベル1, ...])\` のように、低い順に並べた配列で書きます。
レベルは 2〜10 個で、配列の順番がそのまま番号になります。

## score の読み方

- \`score\`：レベル番号 × 確率の合計。レベルの間の値になることがある
- \`probabilities\`：レベルごとの確率（キーは "0", "1", ... の文字列）
- \`legend\`：番号 → レベルの説明
- \`confidence\`：確率が 1 つのレベルに集中しているほど高い

1.3 なら「ほぼレベル 1、少しレベル 2」です。
ただし、同じ score でも分布は違うことがあります。
1.0 は「全部がレベル 1」かもしれませんし、「レベル 0 と 2 に半分ずつ」かもしれません。
\`probabilities\` と \`confidence\` もあわせて見ます。

## レベルの書き方

- 程度ではなく状況を書く。"Moderately severe" ではなく "Broken or degraded feature, but workaround exists"
- 各レベルは別々に評価され、モデルは番号も隣のレベルも見ない。"0" "1" "2" だけのレベルでは比べる材料がない
- 1 つの Score で測る次元は 1 つだけ。複数の要素を混ぜると confidence が下がる
- 迷ったらレベルを増やすより、はっきり書き分けられるレベルだけにする

右のコードは、ドキュメントにある Safari の不具合報告です。
説明つきのレベルと番号だけのレベルを並べて比べます。
ドキュメントでは、番号だけにすると別の報告で score 0.57、confidence 0.35 に割れた例が紹介されています。
`,
      en: `
Score measures a position on a spectrum whose stages you can describe in words.
Write it as an array ordered from low to high, like \`score(instructions, [level0, level1, ...])\`.
You can have 2 to 10 levels, and the array order becomes the level numbers.

## Reading a score

- \`score\`: the sum of level number × probability. It can land between levels
- \`probabilities\`: the probability of each level (keys are the strings "0", "1", ...)
- \`legend\`: level number → level description
- \`confidence\`: higher when the probability is concentrated on one level

A score of 1.3 means "mostly level 1, a little level 2".
But the same score can come from different distributions.
1.0 could mean "all level 1", or "half level 0 and half level 2".
Look at \`probabilities\` and \`confidence\` as well.

## Writing levels

- Describe situations, not degrees. Not "Moderately severe" but "Broken or degraded feature, but workaround exists"
- Each level is evaluated on its own, and the model sees neither the numbers nor the neighboring levels. Levels that only say "0", "1", "2" give it nothing to compare
- Measure only one dimension per Score. Mixing several factors lowers confidence
- When in doubt, keep only the levels you can clearly tell apart instead of adding more

The code on the right uses the Safari bug report from the documentation.
It compares levels with descriptions against levels that are only numbers.
The documentation shows another report where numbers-only levels split into a score of 0.57 with a confidence of 0.35.
`,
    },
    code: { ja: scoreJa, en: scoreEn },
    exercise: {
      goal: {
        ja: "`state` は変えずに、`severity` のレベルを `{ what, examples }` のオブジェクトに書き換えて、confidence を 0.8 以上にしましょう。",
        en: "Without changing `state`, rewrite the `severity` levels as `{ what, examples }` objects and get confidence to 0.8 or higher.",
      },
      hint: {
        ja: '例は実際の入力に似ているほど判断の材料になります。レベル 1 に "export fails in one browser but works in another" のような例を入れてみましょう。',
        en: 'The closer the examples are to the real input, the more they help. Try adding an example like "export fails in one browser but works in another" to level 1.',
      },
      check: (run) => {
        const call = lastCallWith(run, "severity");
        const answer = call?.answers.severity;
        if (!call || answer?.type !== "score") return notRunYet;
        const question = call.questions.severity;
        const structured =
          question?.type === "score" && question.criteria.every((level) => typeof level === "object" && level !== null);
        const keptState = typeof call.state === "string" && call.state.includes("Safari");
        const confidence = round2(answer.confidence ?? 0);
        if (!keptState) {
          return fail({ ja: "state は Safari の報告のままにしてください", en: "Keep the state as the Safari report." });
        }
        if (!structured) {
          return fail({
            ja: "レベルをすべてオブジェクト（例: { what, examples }）にしてください",
            en: "Make every level an object (for example, { what, examples }).",
          });
        }
        return (answer.confidence ?? 0) >= 0.8
          ? pass({
              ja: `confidence ${confidence}。例が判断の材料になりました`,
              en: `confidence ${confidence}. The examples gave the model something to go on.`,
            })
          : fail({
              ja: `confidence は ${confidence} です。入力に似た例をレベルに足してみましょう`,
              en: `confidence is ${confidence}. Try adding examples similar to the input to the levels.`,
            });
      },
    },
    docs: [
      { title: "Score", url: `${DOCS}/primitives/score` },
      { title: "Advanced: structure", url: `${DOCS}/primitives/advanced` },
    ],
  },
  {
    id: lessonId("types"),
    part: "basics",
    title: { ja: "型の選び方", en: "Choosing a type" },
    lead: {
      ja: "Choice・Score・Noul は答えの形で選ぶ。同じ問いでも型が違えば別の問いになる。",
      en: "Choose Choice, Score, or Noul by the shape of the answer you want. The same question asked with another type is a different question.",
    },
    body: {
      ja: `
3 つの型は、欲しい答えの形で選びます。

| 型 | 向いている問い | 例 |
| --- | --- | --- |
| Choice | 順序のない選択肢から 1 つ | 担当部署、文書の種類、プログラミング言語 |
| Score | 言葉で書ける段階のどこか | 不具合の深刻度、不満の強さ、経験の深さ |
| Noul | はっきりした yes/no | 返金を求めているか、個人情報を含むか |

どちらでもよさそうなら、コードで扱いやすい方を選びます。
Choice は分岐に、Score はしきい値に、Noul は \`if\` にそのまま対応します。

## 同じ問いでも数字はそろわない

右のコードは「返金を求めているか」を Noul と、yes/no の Choice の両方で聞き、さらに否定の Noul も聞いています。
ドキュメントには次のような例が載っています。

- 「サイズが合わない、どうすればいい？」という問い合わせで、Noul は 0.22、yes/no の Choice の yes は 0.01 だった
- 右と同じ二重請求の問い合わせで、問いとその否定の Noul を足すと 1.19 になった（0.72 + 0.47）

Choice は選択肢どうしの相対的な比較で「どれか」を決め、Noul はそれぞれを絶対的に評価します。
そのため、こうした算術的な関係はモデルに期待できません。

- 1 つの判断は 1 つの聞き方で聞く
- Noul で調整したしきい値を Choice に使い回さない
- 「確率の和が 1」のような関係が必要なら、コードの側で保証する
`,
      en: `
Choose among the three types by the shape of the answer you want.

| Type | Good for | Examples |
| --- | --- | --- |
| Choice | One of several unordered options | Department, document type, programming language |
| Score | A point on stages you can describe in words | Bug severity, strength of a complaint, depth of experience |
| Noul | A clear yes/no | Asks for a refund, contains personal data |

If either would do, pick the one that is easier to handle in code.
Choice maps to a branch, Score to a threshold, and Noul directly to an \`if\`.

## The numbers do not line up, even for the same question

The code on the right asks "Is the customer asking for a refund?" both as a Noul and as a yes/no Choice, and also asks the negated Noul.
The documentation includes examples like these.

- For the ticket "I'm not happy with the fit. What are my options here?", the Noul was 0.22 while the yes of the yes/no Choice was 0.01
- For the same double-charge ticket as on the right, the Noul for the question and the Noul for its negation added up to 1.19 (0.72 + 0.47)

Choice decides "which one" by comparing the options against each other, while Noul evaluates each question on its own.
So you cannot expect the model to keep arithmetic relationships like these.

- Ask each judgment in one way only
- Do not reuse a threshold tuned for a Noul on a Choice
- If you need a relationship such as "the probabilities add up to 1", enforce it in code
`,
    },
    code: { ja: typesJa, en: typesEn },
    docs: [
      { title: "Primitives (Questions)", url: `${DOCS}/primitives` },
      { title: "Jev 1.13 jaggedness", url: `${DOCS}/model-jaggedness/jev-1.13#common-sense-structural-invariants` },
    ],
  },
];
