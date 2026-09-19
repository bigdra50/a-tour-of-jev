// Put everything the judgment needs (conversation, order, policy) into one state
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

// Questions point to parts of the state with paths wrapped in backticks
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
