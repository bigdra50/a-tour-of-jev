import playgroundEn from "./code/en/playground.js" with { type: "text" };
import playgroundJa from "./code/ja/playground.js" with { type: "text" };
import { type Lesson, lessonId } from "./types.ts";

/** 自由に試す場所。コードで使える関数の早見表も兼ねる。 */
export const playground: Lesson = {
  id: lessonId("playground"),
  part: "free",
  title: { ja: "自由に試す", en: "Playground" },
  lead: {
    ja: "レッスンで学んだことを、自分の題材で試す。",
    en: "Try what you learned in the lessons on your own material.",
  },
  body: {
    ja: `
ここでは課題はありません。
自分の業務の文章やデータを state に入れて、質問を試してみてください。

## 使える関数

| 関数 | 説明 |
| --- | --- |
| \`await jev({ state, questions, model?, provider? })\` | Jev を呼ぶ。答えは \`res.answers.<質問ID>\` |
| \`noul(instructions, criteria?)\` | yes/no の質問。\`criteria\` は \`{ true, false }\` |
| \`choice(instructions, { 選択肢: 説明 })\` | 選択肢から 1 つを選ぶ質問（最大 255 個） |
| \`score(instructions, [レベル0, レベル1, ...])\` | 順序つきレベルの質問（2〜10 個） |
| \`await llm.evaluate({ state, questions, model? })\` | 同じ質問を小型 LLM に答えさせる（Gateway のキーが必要） |
| \`await llm.generate({ prompt, system?, model?, maxOutputTokens? })\` | LLM で文章を生成する（Gateway のキーが必要） |
| \`print(...values)\` | 値を 1 行で出力する。\`console.log\` も同じ |
| \`show(value, label?)\` | 値を目立つ形で出力する。オブジェクトの配列は表になる |
| \`mean(numbers)\`、\`stdev(numbers)\` | 平均と標本標準偏差 |
| \`sleep(ms)\` | 指定したミリ秒だけ待つ |
| \`settings\` | 画面上部で選んだ経路とモデル |

\`jev()\` の答えには \`meta\` もつきます。
\`meta.latencyMs\` は所要時間、\`meta.costUsd\` は費用、\`meta.upstream\` は上流に送った内容です。

## 気をつけること

- 呼び出しが失敗すると例外になる。\`try { ... } catch (error) { ... }\` で拾える
- コードは実行のたびに新しい環境で動く。前の実行の変数は残らない
- 実行は 2 分で打ち切る
- 書いたコードはこのブラウザに保存される。「初期コードに戻す」で消える
`,
    en: `
There is no exercise here.
Put text or data from your own work into the state and try out questions.

## Available functions

| Function | Description |
| --- | --- |
| \`await jev({ state, questions, model?, provider? })\` | Calls Jev. The answer is \`res.answers.<questionId>\` |
| \`noul(instructions, criteria?)\` | A yes/no question. \`criteria\` is \`{ true, false }\` |
| \`choice(instructions, { option: description })\` | A question that picks one of the options (up to 255) |
| \`score(instructions, [level0, level1, ...])\` | A question with ordered levels (2 to 10) |
| \`await llm.evaluate({ state, questions, model? })\` | Has a small LLM answer the same questions (needs a Gateway key) |
| \`await llm.generate({ prompt, system?, model?, maxOutputTokens? })\` | Generates text with an LLM (needs a Gateway key) |
| \`print(...values)\` | Prints the values on one line. \`console.log\` does the same |
| \`show(value, label?)\` | Shows a value prominently. An array of objects becomes a table |
| \`mean(numbers)\`, \`stdev(numbers)\` | Mean and sample standard deviation |
| \`sleep(ms)\` | Waits for the given number of milliseconds |
| \`settings\` | The route and model chosen at the top of the screen |

Answers from \`jev()\` also come with \`meta\`.
\`meta.latencyMs\` is the time taken, \`meta.costUsd\` is the cost, and \`meta.upstream\` is what was sent upstream.

## Things to keep in mind

- A failed call throws an exception. You can catch it with \`try { ... } catch (error) { ... }\`
- Your code runs in a fresh environment every time. Variables from the previous run do not carry over
- A run is cut off after 2 minutes
- Your code is saved in this browser. "Reset code" clears it
`,
  },
  code: { ja: playgroundJa, en: playgroundEn },
  docs: [
    { title: "API reference", url: "https://docs.typesafe.ai/api" },
    { title: "Cookbooks", url: "https://docs.typesafe.ai/cookbooks/consistency_noul_cookbook" },
  ],
};
