const state = "My card was charged twice for order A-104.";

const one = await jev({ state, questions: { billing: noul("Is this about billing?") } });

const two = await jev({
  state,
  questions: {
    billing: noul("Is this about billing?"),
    refund: noul("Does the customer ask for a refund?"),
  },
});

const longState = await jev({
  state: `${state} ${"Here are some more details about my account. ".repeat(40)}`,
  questions: { billing: noul("Is this about billing?") },
});

show(
  [
    { 条件: "質問 1 つ", 入力トークン: one.usage.input_tokens, 出力トークン: one.usage.output_tokens },
    { 条件: "質問 2 つ", 入力トークン: two.usage.input_tokens, 出力トークン: two.usage.output_tokens },
    {
      条件: "長い state + 質問 1 つ",
      入力トークン: longState.usage.input_tokens,
      出力トークン: longState.usage.output_tokens,
    },
  ],
  "何がトークンを増やすか",
);

// 料金は入力トークンだけ（jev-1.13 は 100 万トークンあたり 0.042 ドル）
const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;
const perCall = two.usage.input_tokens * USD_PER_INPUT_TOKEN;
print(`質問 2 つの呼び出しを 100 万回すると、およそ $${(perCall * 1_000_000).toFixed(2)}`);
