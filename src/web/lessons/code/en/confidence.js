const intent = choice("What is the user trying to do in `utterance`?", {
  check_balance: "View the account balance",
  approve_transfer: "Approve the pending withdrawal or transfer request",
  support: "Get help with an issue",
});

// The harder an action is to undo, the higher the confidence it requires
function decide(answer) {
  if (answer.confidence < 0.6) return "hand off to an operator";
  if (answer.choice === "check_balance") return "read out the balance";
  if (answer.choice === "approve_transfer") {
    return answer.confidence > 0.85 ? "execute the transfer" : "confirm the transfer first";
  }
  return "hand off to an operator";
}

const utterances = [
  "What's my balance?",
  "Yes, approve the pending transfer to my landlord.",
  "Can you do the money thing we talked about?",
];

// Inputs with different states go in separate requests (sent in parallel)
const results = await Promise.all(utterances.map((utterance) => jev({ state: { utterance }, questions: { intent } })));

show(
  results.map((res, i) => ({
    utterance: utterances[i],
    choice: res.answers.intent.choice,
    confidence: res.answers.intent.confidence,
    action: decide(res.answers.intent),
  })),
  "Branching on confidence",
);
