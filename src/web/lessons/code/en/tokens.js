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
    { condition: "1 question", "input tokens": one.usage.input_tokens, "output tokens": one.usage.output_tokens },
    { condition: "2 questions", "input tokens": two.usage.input_tokens, "output tokens": two.usage.output_tokens },
    {
      condition: "long state + 1 question",
      "input tokens": longState.usage.input_tokens,
      "output tokens": longState.usage.output_tokens,
    },
  ],
  "What increases tokens",
);

// Only input tokens are billed (jev-1.13 costs $0.042 per million tokens)
const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;
const perCall = two.usage.input_tokens * USD_PER_INPUT_TOKEN;
print(`Making the 2-question call 1 million times costs about $${(perCall * 1_000_000).toFixed(2)}`);
