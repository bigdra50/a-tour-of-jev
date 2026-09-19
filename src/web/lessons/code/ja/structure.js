const ticket = "I shipped my return back two weeks ago. Has it been processed yet?";

// 説明を 1 行の文字列で書いた場合
const plain = {
  return_policy: "Questions about returns",
  return_status: "Questions about a return",
};

// 何を含むか（what）・隣の選択肢に行くもの（not_for）・例（examples）に分けて書いた場合
const structured = {
  return_policy: {
    what: "Questions about the rules: return windows, eligibility, how to start a return",
    not_for: "Checking the progress of a return that was already sent",
    examples: ["How many days do I have to return shoes?", "Can I return a sale item?"],
  },
  return_status: {
    what: "Checking the progress of a return the customer already started or shipped",
    not_for: "General questions about the return rules",
    examples: ["Did you receive my return?", "When will my return refund arrive?"],
  },
};

const res = await jev({
  state: ticket,
  questions: {
    plain: choice("What is this ticket about?", plain),
    structured: choice(
      { question: "What is this ticket about?", focus: "Classify the customer's primary request." },
      structured,
    ),
  },
});

for (const [id, answer] of Object.entries(res.answers)) {
  print(id.padEnd(10), answer.choice.padEnd(14), "confidence", answer.confidence.toFixed(2));
}
