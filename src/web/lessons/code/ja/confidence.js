const intent = choice("What is the user trying to do in `utterance`?", {
  check_balance: "View the account balance",
  approve_transfer: "Approve the pending withdrawal or transfer request",
  support: "Get help with an issue",
});

// 取り消せない操作ほど、高い confidence を求める
function decide(answer) {
  if (answer.confidence < 0.6) return "オペレーターへ回す";
  if (answer.choice === "check_balance") return "残高を読み上げる";
  if (answer.choice === "approve_transfer") {
    return answer.confidence > 0.85 ? "送金を実行する" : "送金してよいか確認する";
  }
  return "オペレーターへ回す";
}

const utterances = [
  "What's my balance?",
  "Yes, approve the pending transfer to my landlord.",
  "Can you do the money thing we talked about?",
];

// state が違う入力は、別々のリクエストにする（並行して送る）
const results = await Promise.all(utterances.map((utterance) => jev({ state: { utterance }, questions: { intent } })));

show(
  results.map((res, i) => ({
    発話: utterances[i],
    choice: res.answers.intent.choice,
    confidence: res.answers.intent.confidence,
    行動: decide(res.answers.intent),
  })),
  "confidence による分岐",
);
