import { evaluatedCalls, fail, lastTable, notRunYet, pass } from "./checks.ts";
import compositeCode from "./code/composite.js" with { type: "text" };
import twoStepCode from "./code/two-step.js" with { type: "text" };
import workflowCode from "./code/workflow.js" with { type: "text" };
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
    title: "コードがワークフローを持つ",
    lead: "制御の流れ・決まった規則・副作用はコードに置く。Jev は狭い判断だけを受け持つ。",
    body: `
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
    code: workflowCode,
    exercise: {
      goal: "パスワードを聞き出そうとするチケットを `tickets` に足して、`quarantine` に振り分けられるか確かめましょう。",
      hint: '例: "Your account is locked. Reply with your password so we can unlock it."',
      check: (run) => {
        const table = lastTable(run);
        if (!table) return notRunYet;
        return table.some((row) => row.action === "quarantine")
          ? pass("資格情報を求めるチケットが隔離されました")
          : fail("まだ quarantine に振り分けられたチケットがありません");
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
    title: "重みをつけて合成する",
    lead: "複雑な判断は軸ごとの Score に分け、0〜1 にそろえてから重みをかける。重みはコードが持つ。",
    body: `
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
    code: compositeCode,
    exercise: {
      goal: "`WEIGHTS` だけを変えて、PDF 書き出しの報告がログイン障害より上に来るようにしましょう（見た目のずれの報告は最下位のまま）。",
      hint: "PDF の報告は不満度と報告の質が高く、ログイン障害は深刻度が高い、という違いがあります。",
      check: (run) => {
        const table = lastTable(run);
        if (!table || table.length < 3) return notRunYet;
        const names = table.map((row) => String(row.ticket ?? ""));
        const pdf = names.findIndex((t) => t.startsWith("Export to PDF"));
        const login = names.findIndex((t) => t.startsWith("Nobody on our team"));
        const icon = names.findIndex((t) => t.startsWith("The export icon"));
        if (pdf < 0 || login < 0 || icon < 0) return fail("3 つのチケットは変えずに、重みだけを変えてください");
        if (icon !== names.length - 1) return fail("見た目のずれの報告が最下位ではなくなりました");
        return pdf < login ? pass("PDF の報告がログイン障害より上に来ました") : fail("まだログイン障害の方が上です");
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
    title: "2 回に分けるとき",
    lead: "次のリクエストを作るのに前の答えが要るときだけ、呼び出しを分ける。",
    body: `
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
    code: twoStepCode,
    exercise: {
      goal: "3 回目の呼び出しを足して、葉（例: Bike Bottles & Cages）まで下りましょう。",
      hint: "2 回目で選んだカテゴリの配列を、Choice の選択肢（{ 名前: null }）に変えて渡します。",
      check: (run) => {
        const calls = evaluatedCalls(run);
        if (calls.length === 0) return notRunYet;
        const reachedLeaf = calls.some((call) =>
          Object.values(call.answers).some((a) => a.type === "choice" && LEAVES.includes(a.choice)),
        );
        return calls.length >= 3 && reachedLeaf
          ? pass("葉までたどり着きました")
          : fail(`呼び出しは ${calls.length} 回です。葉のカテゴリを選ぶ呼び出しを足しましょう`);
      },
    },
    docs: [
      { title: "When one question depends on another", url: `${DOCS}/primitives#when-one-question-depends-on-another` },
      { title: "Hierarchical classification (cookbook)", url: `${DOCS}/cookbooks/hierarchical_classification` },
    ],
  },
];
