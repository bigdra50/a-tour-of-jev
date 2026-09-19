import { evaluatedCalls, fail, lastAnswer, lastCallWith, notRunYet, pass, round2 } from "./checks.ts";
import atomicCode from "./code/atomic.js" with { type: "text" };
import stateCode from "./code/state.js" with { type: "text" };
import structureCode from "./code/structure.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

const SPAM_WEIGHTS = { requests_credentials: 0.45, sender_mismatch: 0.3, unexpected_reward: 0.25 } as const;

export const inputs: readonly Lesson[] = [
  {
    id: lessonId("state"),
    part: "inputs",
    title: "state の設計",
    lead: "判断の材料を 1 つの state にまとめる。必要な部分だけを渡し、質問からはパスで指す。",
    body: `
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
    code: stateCode,
    exercise: {
      goal: "サポート側の返信 `ticket.messages[1].text` を指す Noul を足して、返金を求めていないと判定される（0.5 未満になる）か確かめましょう。",
      hint: '例: ``support_requests_refund: noul("Does `ticket.messages[1].text` request a refund?")``',
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
        if (value === undefined) return fail("`ticket.messages[1].text` を指す Noul がまだありません");
        return value < 0.5
          ? pass(`サポートの返信は返金を求めていない（${round2(value)}）と判定されました`)
          : fail(`${round2(value)} でした。質問の書き方を見直してみましょう`);
      },
    },
    docs: [
      { title: "State", url: `${DOCS}/concepts/state` },
      { title: "Reference specific fields", url: `${DOCS}/primitives#reference-specific-fields` },
      { title: "Models（上限）", url: `${DOCS}/models` },
    ],
  },
  {
    id: lessonId("structure"),
    part: "inputs",
    title: "説明を構造化する",
    lead: "説明が長くなったら、1 本の文字列に詰め込まずにオブジェクトで書く。",
    body: `
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
    code: structureCode,
    exercise: {
      goal: "`ticket` を返品ルールの質問（例: セール品は返品できるか）に書き換え、`structured` が return_policy を confidence 0.8 以上で選ぶか確かめましょう。",
      check: (run) => {
        const answer = lastAnswer(run, "structured");
        if (answer?.type !== "choice") return notRunYet;
        const confidence = answer.confidence ?? 0;
        if (answer.choice !== "return_policy") return fail(`今は ${answer.choice} が選ばれています`);
        return confidence >= 0.8
          ? pass(`return_policy を confidence ${round2(confidence)} で選びました`)
          : fail(`return_policy ですが confidence は ${round2(confidence)} です`);
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
    title: "質問を分解する",
    lead: "広い質問は複数の判断を隠す。1 つの性質だけを見る質問に分け、コードで組み合わせる。",
    body: `
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
    code: atomicCode,
    exercise: {
      goal: "差出人と本文を正規の業務連絡に書き換えて、合成した `spam_risk` を 0.2 未満にしましょう。",
      hint: "差出人の display_name とメールのドメインをそろえ、本文から報酬とパスワードの話を消します。",
      check: (run) => {
        const call = lastCallWith(run, "requests_credentials");
        if (!call) return notRunYet;
        const nouls = Object.entries(SPAM_WEIGHTS).map(([id, w]) => {
          const answer = call.answers[id];
          return answer?.type === "noul" ? w * answer.noul : Number.NaN;
        });
        const risk = nouls.reduce((sum, v) => sum + v, 0);
        if (Number.isNaN(risk)) return fail("3 つの分解した質問を残したまま実行してください");
        return risk < 0.2
          ? pass(`spam_risk = ${round2(risk)}。正規のメールと判断されました`)
          : fail(`spam_risk = ${round2(risk)}。どの要素が高いかを出力で確かめましょう`);
      },
    },
    docs: [
      { title: "How to build with TypeSafe", url: `${DOCS}/concepts/how-to-build-with-system-one` },
      { title: "Ask for one snap judgment", url: `${DOCS}/primitives#ask-for-one-snap-judgment-per-question` },
    ],
  },
];
