import { fail, lastAnswer, lastCallWith, notRunYet, pass, round2 } from "./checks.ts";
import choiceCode from "./code/choice.js" with { type: "text" };
import helloCode from "./code/hello.js" with { type: "text" };
import noulCode from "./code/noul.js" with { type: "text" };
import scoreCode from "./code/score.js" with { type: "text" };
import typesCode from "./code/types.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

export const basics: readonly Lesson[] = [
  {
    id: lessonId("hello"),
    part: "basics",
    title: "Hello Jev",
    lead: "Jev は文章を書かない。state と質問を渡すと、型のついた答えと確率が返ってくる。",
    body: `
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
    code: helloCode,
    exercise: {
      goal: "`state` を書き換えて、`is_urgent` が 0.2 を下回る文章にしてみましょう。",
      hint: "急ぎの気配がない問い合わせにします。例えば、来月から請求書の送付先を変えたいという連絡です。",
      check: (run) => {
        const answer = lastAnswer(run, "is_urgent");
        if (answer?.type !== "noul") return notRunYet;
        return answer.noul < 0.2
          ? pass(`is_urgent = ${round2(answer.noul)}。急ぎではないと判断されました`)
          : fail(`is_urgent = ${round2(answer.noul)}。まだ急ぎに見えるようです`);
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
    title: "Noul は確率",
    lead: "Noul の値は yes である確率。0.5 は「中くらい」ではなく「五分五分」を表す。",
    body: `
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
    code: noulCode,
    exercise: {
      goal: "`ticket` をはっきり返金を求める文に書き換えて、3 つの答えがすべて 0.8 を超えるようにしましょう。",
      hint: '例: "This doesn\'t fit. I want my money back for this order."',
      check: (run) => {
        const call = lastCallWith(run, "asks_refund_defined");
        if (!call) return notRunYet;
        const values = Object.values(call.answers).flatMap((a) => (a.type === "noul" ? [a.noul] : []));
        return values.length >= 3 && values.every((v) => v > 0.8)
          ? pass(`すべて 0.8 超え（${values.map(round2).join(" / ")}）`)
          : fail(`今の値: ${values.map(round2).join(" / ")}。すべて 0.8 を超えるまで書き換えてみましょう`);
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
    title: "Choice と分布",
    lead: "決まった選択肢から 1 つ選ぶ。全選択肢の確率と confidence がついてくる。",
    body: `
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
    code: choiceCode,
    exercise: {
      goal: "`ticket` を書き換えて、`department` に billing を confidence 0.8 以上で選ばせましょう。",
      hint: '請求の話だけにします。例: "I was charged twice for my last order."',
      check: (run) => {
        const answer = lastAnswer(run, "department");
        if (answer?.type !== "choice") return notRunYet;
        const confidence = answer.confidence ?? 0;
        if (answer.choice !== "billing") return fail(`今は ${answer.choice} が選ばれています`);
        return confidence >= 0.8
          ? pass(`billing を confidence ${round2(confidence)} で選びました`)
          : fail(`billing ですが confidence が ${round2(confidence)} です。ほかのチームの要素を減らしてみましょう`);
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
    title: "Score と順序つきレベル",
    lead: "低い順に並べたレベルのどこに当たるか。score はレベル番号の確率加重平均。",
    body: `
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
    code: scoreCode,
    exercise: {
      goal: "`state` は変えずに、`severity` のレベルを `{ what, examples }` のオブジェクトに書き換えて、confidence を 0.8 以上にしましょう。",
      hint: '例は実際の入力に似ているほど判断の材料になります。レベル 1 に "export fails in one browser but works in another" のような例を入れてみましょう。',
      check: (run) => {
        const call = lastCallWith(run, "severity");
        const answer = call?.answers.severity;
        if (!call || answer?.type !== "score") return notRunYet;
        const question = call.questions.severity;
        const structured =
          question?.type === "score" && question.criteria.every((level) => typeof level === "object" && level !== null);
        const keptState = typeof call.state === "string" && call.state.includes("Safari");
        const confidence = answer.confidence ?? 0;
        if (!keptState) return fail("state は Safari の報告のままにしてください");
        if (!structured) return fail("レベルをすべてオブジェクト（例: { what, examples }）にしてください");
        return confidence >= 0.8
          ? pass(`confidence ${round2(confidence)}。例が判断の材料になりました`)
          : fail(`confidence は ${round2(confidence)} です。入力に似た例をレベルに足してみましょう`);
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
    title: "型の選び方",
    lead: "Choice・Score・Noul は答えの形で選ぶ。同じ問いでも型が違えば別の問いになる。",
    body: `
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
    code: typesCode,
    docs: [
      { title: "Primitives (Questions)", url: `${DOCS}/primitives` },
      { title: "Jev 1.13 jaggedness", url: `${DOCS}/model-jaggedness/jev-1.13#common-sense-structural-invariants` },
    ],
  },
];
