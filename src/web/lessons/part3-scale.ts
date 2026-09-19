import { evaluatedCalls, fail, lastTable, notRunYet, pass } from "./checks.ts";
import confidenceCode from "./code/confidence.js" with { type: "text" };
import consistencyCode from "./code/consistency.js" with { type: "text" };
import fanoutCode from "./code/fanout.js" with { type: "text" };
import tokensCode from "./code/tokens.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

const DOCS = "https://docs.typesafe.ai";

export const scale: readonly Lesson[] = [
  {
    id: lessonId("fanout"),
    part: "scale",
    title: "並列質問と投機",
    lead: "要りそうな質問は全部 1 回で聞く。質問は並列に評価されるので、増やしても遅くならない。",
    body: `
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
    code: fanoutCode,
    exercise: {
      goal: "まとめて聞く `questions` に質問を 1 つ足して（例: 使っているブラウザを選ぶ Choice）、時間がほとんど変わらないことを確かめましょう。",
      check: (run) => {
        const calls = evaluatedCalls(run);
        if (calls.length === 0) return notRunYet;
        const biggest = Math.max(...calls.map((call) => Object.keys(call.questions).length));
        return biggest >= 6
          ? pass(`${biggest} 問を 1 回で聞けました。表の「ミリ秒」を前回と比べてみましょう`)
          : fail(`まとめた呼び出しの質問は ${biggest} 問です。6 問以上にしてみましょう`);
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
    title: "confidence で分岐する",
    lead: "答えは「何を」、confidence は「任せてよいか」を教える。しきい値はリスクで変える。",
    body: `
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
    code: confidenceCode,
    exercise: {
      goal: "`utterances` に発話を足したり書き換えたりして、表の「行動」に 4 種類すべて（読み上げ・実行・確認・オペレーター）が出るようにしましょう。",
      hint: "送金を頼んでいるようで曖昧な発話や、銀行と関係のない発話を試してみます。",
      check: (run) => {
        const table = lastTable(run);
        if (!table) return notRunYet;
        const kinds = new Set(table.map((row) => row.行動).filter((v) => typeof v === "string"));
        return kinds.size >= 4
          ? pass("4 種類の行動がすべて出ました")
          : fail(`今は ${kinds.size} 種類（${[...kinds].join("、")}）です`);
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
    title: "同じ質問を何度も聞く",
    lead: "Jev は繰り返しても安定した答えを返すよう作られている。10 回聞いてばらつきを測る。",
    body: `
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
    code: consistencyCode,
    docs: [
      { title: "Self-consistency: nouls", url: `${DOCS}/cookbooks/consistency_noul_cookbook` },
      { title: "Self-consistency: choices", url: `${DOCS}/cookbooks/consistency_choice_cookbook` },
    ],
  },
  {
    id: lessonId("tokens"),
    part: "scale",
    title: "トークンと費用",
    lead: "課金は入力トークンだけ。state は 1 回だけ数えられ、質問を足すとその分だけ増える。",
    body: `
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
    code: tokensCode,
    docs: [
      { title: "Models（価格・上限）", url: `${DOCS}/models` },
      { title: "Handling rate limits", url: `${DOCS}/api#handling-rate-limits` },
    ],
  },
];
