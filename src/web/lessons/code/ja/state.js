// 1 つの state に、判断に必要な材料（会話・注文・規約）をまとめる
const state = {
  ticket: {
    subject: "Duplicate charge",
    messages: [
      { from: "customer", text: "I was charged twice for order A-104. Please refund the duplicate." },
      { from: "support", text: "We are checking the charges." },
    ],
  },
  order: {
    id: "A-104",
    charges: [
      { amount_usd: 49, status: "captured" },
      { amount_usd: 49, status: "captured" },
    ],
  },
  refund_policy: "Duplicate charges are eligible for a refund.",
};

// 質問からは、バッククォートで囲んだパスで state の一部を指す
const res = await jev({
  state,
  questions: {
    refund_requested: noul("Does `ticket.messages[0].text` request a refund?"),
    policy_supports_refund: noul(
      "Does `refund_policy` support the refund requested in `ticket.messages[0].text`, given `order.charges`?",
    ),
  },
});

for (const [id, answer] of Object.entries(res.answers)) {
  print(id, answer.noul.toFixed(2));
}
