import { evaluatedCalls, fail, lastAnswer, lastCallWith, notRunYet, pass, round2 } from "./checks.ts";
import atomicEn from "./code/en/atomic.js" with { type: "text" };
import stateEn from "./code/en/state.js" with { type: "text" };
import structureEn from "./code/en/structure.js" with { type: "text" };
import atomicJa from "./code/ja/atomic.js" with { type: "text" };
import stateJa from "./code/ja/state.js" with { type: "text" };
import structureJa from "./code/ja/structure.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

const SPAM_WEIGHTS = { requests_credentials: 0.45, sender_mismatch: 0.3, unexpected_reward: 0.25 } as const;

export const inputs: readonly Lesson[] = [
  {
    id: lessonId("state"),
    part: "inputs",
    title: { ja: "state の設計", en: "Designing the state" },
    lead: {
      ja: "判断の材料を 1 つの state にまとめる。必要な部分だけを渡し、質問からはパスで指す。",
      en: "Put the material for the judgment into a single state. Pass only what you need, and point to its parts from the questions with paths.",
    },
    body: {
      ja: `
state は、モデルに評価してもらう材料です。
文字列・JSON オブジェクト・配列のどれでも渡せます。

| 形 | 向いているもの | 例 |
| --- | --- | --- |
| 文字列 | 1 つのメッセージや文章 | \`"My card was charged twice."\` |
| オブジェクト | 名前のついた項目、関連するレコード、アプリの状態 | \`{ "message": "...", "order_id": "A-104" }\` |
| 配列 | メッセージやレコードの並び | \`["Hi", "My customer number is TS1337."]\` |

ほとんどの場合はオブジェクトがおすすめです。
部分ごとに名前がつき、関係がはっきりします。
ドキュメントは state を「専門家の前に並べる資料」にたとえています。
会話と注文と規約のように、比べる必要があるものは同じ state に入れます。

## 質問からパスで指す

state がオブジェクトのときは、質問の中で \`\` \`ticket.messages[0].text\` \`\` のように、バッククォートで囲んだドットとインデックスのパスで場所を指します。
バッククォートも含めて書くのがポイントです。
どの部分について判断するのかが、モデルにはっきり伝わります。

## 入れすぎない

- 質問に関係ない情報は入れない。無関係な情報が多いほど判断を誤りやすくなる
- 1 リクエストの上限は、全体で 64k トークン、state と最長の質問で 32k トークン
- 入力はテキストだけ。画像や音声はテキストや構造化したフィールドにしてから渡す
- モデルの知識に頼らず、判断に要る最新の情報は自分のデータから state に入れる
`,
      en: `
The state is the material the model evaluates.
You can pass a string, a JSON object, or an array.

| Shape | Good for | Example |
| --- | --- | --- |
| String | A single message or piece of text | \`"My card was charged twice."\` |
| Object | Named fields, related records, app state | \`{ "message": "...", "order_id": "A-104" }\` |
| Array | A sequence of messages or records | \`["Hi", "My customer number is TS1337."]\` |

In most cases, an object is the best choice.
Each part gets a name, and the relationships between the parts are clear.
The documentation says to think of the state as "the material you would present to a panel of experts before asking them to make a judgment".
Things that need to be compared, like a conversation, an order, and a policy, go into the same state.

## Point to parts with paths from the questions

When the state is an object, point to a location inside a question with a dot-and-index path wrapped in backticks, like \`\` \`ticket.messages[0].text\` \`\`.
The key is to include the backticks themselves.
This tells the model exactly which part to judge.

## Don't put in too much

- Leave out information unrelated to the questions. The more irrelevant information there is, the easier it is to misjudge
- The limit per request is 64k tokens in total, and 32k tokens for the state plus the longest question
- Input is text only. Turn images and audio into text or structured fields before passing them
- Do not rely on the model's knowledge. Put the up-to-date information the judgment needs into the state from your own data
`,
    },
    code: { ja: stateJa, en: stateEn },
    exercise: {
      goal: {
        ja: "サポート側の返信 `ticket.messages[1].text` を指す Noul を足して、返金を求めていないと判定される（0.5 未満になる）か確かめましょう。",
        en: "Add a Noul that points to the support reply `ticket.messages[1].text`, and check that it is judged as not asking for a refund (below 0.5).",
      },
      hint: {
        ja: '例: ``support_requests_refund: noul("Does `ticket.messages[1].text` request a refund?")``',
        en: 'Example: ``support_requests_refund: noul("Does `ticket.messages[1].text` request a refund?")``',
      },
      check: (run) => {
        const calls = evaluatedCalls(run);
        if (calls.length === 0) return notRunYet;
        const found = calls.flatMap((call) =>
          Object.entries(call.questions).flatMap(([id, q]) => {
            const text = typeof q.instructions === "string" ? q.instructions : JSON.stringify(q.instructions ?? "");
            const answer = call.answers[id];
            return text.includes("ticket.messages[1]") && answer?.type === "noul" ? [answer.noul] : [];
          }),
        );
        const value = found.at(-1);
        if (value === undefined) {
          return fail({
            ja: "`ticket.messages[1].text` を指す Noul がまだありません",
            en: "There is no Noul pointing to `ticket.messages[1].text` yet.",
          });
        }
        const shown = round2(value);
        return value < 0.5
          ? pass({
              ja: `サポートの返信は返金を求めていない（${shown}）と判定されました`,
              en: `The support reply was judged as not asking for a refund (${shown}).`,
            })
          : fail({
              ja: `${shown} でした。質問の書き方を見直してみましょう`,
              en: `It was ${shown}. Try rewording the question.`,
            });
      },
    },
    docs: [
      { title: "State", url: `${DOCS}/concepts/state` },
      { title: "Reference specific fields", url: `${DOCS}/primitives#reference-specific-fields` },
      { title: { ja: "Models（上限）", en: "Models (limits)" }, url: `${DOCS}/models` },
    ],
  },
  {
    id: lessonId("structure"),
    part: "inputs",
    title: { ja: "説明を構造化する", en: "Structuring descriptions" },
    lead: {
      ja: "説明が長くなったら、1 本の文字列に詰め込まずにオブジェクトで書く。",
      en: "When a description grows long, write it as an object instead of cramming it into one string.",
    },
    body: {
      ja: `
次の 4 か所は、文字列だけでなくオブジェクトや配列も受け付けます。

- \`instructions\`（3 つの型すべて）
- Choice の選択肢の説明
- Score の各レベル
- Noul の \`criteria.true\` と \`criteria.false\`

## 取り違えやすい選択肢を書き分ける

右の \`return_policy\`（返品のルール）と \`return_status\`（返品の進み具合）は、どちらも返品や返金の話が出てくるので取り違えやすい組み合わせです。
こういうときは、各選択肢を次のようなフィールドに分けて書きます。

- \`what\`：この選択肢に含まれるもの
- \`not_for\`：隣の選択肢に行くもの
- \`examples\`：代表的な入力の例

フィールド名は API の予約語ではなく、自由に決めて構いません。
モデルは名前も読むので、中身を短く表す名前にします。
全部の選択肢で同じフィールド名を使うと、モデルが選択肢どうしを比べやすくなります。

短くて曖昧さのない説明は、文字列のままで十分です。
まず文字列で書き、取り違えが起きたら構造化する、という順で進めます。

\`instructions\` も同じように、\`{ question, focus }\` や \`{ question, compare: [...] }\` の形で書けます。
`,
      en: `
These four places accept objects and arrays, not just strings.

- \`instructions\` (all three types)
- The descriptions of Choice options
- Each level of a Score
- \`criteria.true\` and \`criteria.false\` of a Noul

## Tell apart options that are easy to confuse

On the right, \`return_policy\` (the rules for returns) and \`return_status\` (the progress of a return) are easy to mix up, because both involve returns and refunds.
In a case like this, split each option into fields like these.

- \`what\`: what this option covers
- \`not_for\`: what belongs to the neighboring option instead
- \`examples\`: examples of typical inputs

The field names are not reserved words in the API, so you can choose them freely.
The model reads the names too, so pick names that briefly describe the contents.
Using the same field names for every option makes it easier for the model to compare the options.

A short, unambiguous description works fine as a string.
Start with strings, and add structure once options start getting confused.

\`instructions\` can be structured the same way, as \`{ question, focus }\` or \`{ question, compare: [...] }\`.
`,
    },
    code: { ja: structureJa, en: structureEn },
    exercise: {
      goal: {
        ja: "`ticket` を返品ルールの質問（例: セール品は返品できるか）に書き換え、`structured` が return_policy を confidence 0.8 以上で選ぶか確かめましょう。",
        en: "Rewrite `ticket` as a question about the return rules (for example, whether sale items can be returned), and check whether `structured` picks return_policy with a confidence of 0.8 or higher.",
      },
      check: (run) => {
        const answer = lastAnswer(run, "structured");
        if (answer?.type !== "choice") return notRunYet;
        const confidence = round2(answer.confidence ?? 0);
        if (answer.choice !== "return_policy") {
          return fail({ ja: `今は ${answer.choice} が選ばれています`, en: `Right now ${answer.choice} is chosen.` });
        }
        return (answer.confidence ?? 0) >= 0.8
          ? pass({
              ja: `return_policy を confidence ${confidence} で選びました`,
              en: `Chose return_policy with confidence ${confidence}.`,
            })
          : fail({
              ja: `return_policy ですが confidence は ${confidence} です`,
              en: `It is return_policy, but confidence is ${confidence}.`,
            });
      },
    },
    docs: [
      { title: "Advanced: structure", url: `${DOCS}/primitives/advanced` },
      { title: "Choice: structured criteria", url: `${DOCS}/primitives/choice#structured-instructions-and-criteria` },
    ],
  },
  {
    id: lessonId("atomic"),
    part: "inputs",
    title: { ja: "質問を分解する", en: "Breaking questions down" },
    lead: {
      ja: "広い質問は複数の判断を隠す。1 つの性質だけを見る質問に分け、コードで組み合わせる。",
      en: "A broad question hides several judgments. Split it into questions that each look at one property, and combine them in code.",
    },
    body: {
      ja: `
ドキュメントが「おそらくいちばん重要な考え方」と書いているのが、質問の分解です。

"Is this email spam?" という 1 つの質問には、複数の判断が隠れています。

- パスワードなどの資格情報を求めているか
- 差出人の名乗りとドメインが食い違っているか
- 頼んでもいない報酬を知らせているか

広い質問のままだと、答えがずれたときにどの判断がずれたのか分かりません。
分けておけば、次のことができます。

- どの判断がずれたかを確かめられる
- 重みをコードで調整できる（プロンプトを書き直さなくてよい）
- 同じ state への質問は並列に評価されるので、分けても往復は増えない

## 一瞬で答えられる質問にする

ドキュメントは、知識のある人が文脈を与えられて 1 秒で答えられる判断を目安にしています。
"Does this message convey urgency?" は良い質問です。
"Analyze this message and determine the best course of action" は、ゆっくり考える必要があるので向いていません。
こういう問いは、小さな質問に分けてコードで組み合わせます。
`,
      en: `
The documentation calls atomic questions "probably the most important concept in this guide".

The single question "Is this email spam?" hides several judgments.

- Whether it asks for credentials such as a password
- Whether the sender's claimed name and the email domain disagree
- Whether it announces a reward nobody asked for

If you keep the broad question, you cannot tell which judgment went wrong when the answer is off.
Once you split it, you can do the following.

- Check which judgment went wrong
- Tune the weights in code (no need to rewrite the prompt)
- Questions about the same state are evaluated in parallel, so splitting adds no round trips

## Ask questions that can be answered in an instant

The documentation's rule of thumb is a judgment that a knowledgeable person, given the context, could make in one second.
"Does this message convey urgency?" is a good question.
"Analyze this message and determine the best course of action" needs slow thinking, so it is a poor fit.
Split questions like that into small ones and combine them in code.
`,
    },
    code: { ja: atomicJa, en: atomicEn },
    exercise: {
      goal: {
        ja: "差出人と本文を正規の業務連絡に書き換えて、合成した `spam_risk` を 0.2 未満にしましょう。",
        en: "Rewrite the sender and the message as a legitimate business email, and get the combined `spam_risk` below 0.2.",
      },
      hint: {
        ja: "差出人の display_name とメールのドメインをそろえ、本文から報酬とパスワードの話を消します。",
        en: "Make the sender's display_name match the email domain, and remove the talk of rewards and passwords from the message.",
      },
      check: (run) => {
        const call = lastCallWith(run, "requests_credentials");
        if (!call) return notRunYet;
        const nouls = Object.entries(SPAM_WEIGHTS).map(([id, w]) => {
          const answer = call.answers[id];
          return answer?.type === "noul" ? w * answer.noul : Number.NaN;
        });
        const risk = nouls.reduce((sum, v) => sum + v, 0);
        if (Number.isNaN(risk)) {
          return fail({
            ja: "3 つの分解した質問を残したまま実行してください",
            en: "Keep the three split questions when you run the code.",
          });
        }
        const shown = round2(risk);
        return risk < 0.2
          ? pass({
              ja: `spam_risk = ${shown}。正規のメールと判断されました`,
              en: `spam_risk = ${shown}. Judged as a legitimate email.`,
            })
          : fail({
              ja: `spam_risk = ${shown}。どの要素が高いかを出力で確かめましょう`,
              en: `spam_risk = ${shown}. Check the output to see which factor is high.`,
            });
      },
    },
    docs: [
      { title: "How to build with TypeSafe", url: `${DOCS}/concepts/how-to-build-with-system-one` },
      { title: "Ask for one snap judgment", url: `${DOCS}/primitives#ask-for-one-snap-judgment-per-question` },
    ],
  },
];
