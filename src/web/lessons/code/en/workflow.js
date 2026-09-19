async function triage(ticket, customer) {
  // 1. If a fixed rule settles it, do not call the model
  if (ticket.status === "closed") return { action: "no_action", reason: "closed ticket" };

  // 2. Put only what the questions need into the state
  const state = {
    ticket: { message: ticket.message, sender: ticket.sender },
    customer: {
      plan: customer.plan,
      open_orders: customer.orders.filter((order) => order.status !== "delivered"),
    },
  };

  // 3. Ask the split-up questions together in one call
  const { answers: a } = await jev({
    state,
    questions: {
      topic: choice("Which team should handle `ticket.message`?", {
        billing: "Charges, invoices, refunds, or subscriptions",
        orders: "Order status, delivery, cancellation, or returns",
        account: "Login, profile, permissions, or security",
      }),
      requests_credentials: noul("Does `ticket.message` ask the recipient to disclose a password or API key?"),
      refund_requested: noul("Does `ticket.message` explicitly request a refund or credit?"),
      mentions_open_order: noul("Does `ticket.message` refer to one of `customer.open_orders` by id or details?"),
    },
  });

  // 4. Write the combining and branching in code
  if (a.requests_credentials.noul >= 0.6) return { action: "quarantine", reason: "credential request" };
  if (a.topic.confidence < 0.75) {
    return { action: "human_review", reason: `topic confidence ${a.topic.confidence}` };
  }
  if (a.topic.choice === "billing") return { action: "billing", refund: a.refund_requested.noul >= 0.7 };
  if (a.topic.choice === "orders") return { action: "orders", known_order: a.mentions_open_order.noul >= 0.7 };
  return { action: "account_support" };
}

const customer = {
  plan: "pro",
  orders: [
    { id: "A-104", status: "shipped" },
    { id: "A-099", status: "delivered" },
  ],
};

const tickets = [
  { status: "open", sender: "kim@example.com", message: "Where is order A-104? It was supposed to arrive yesterday." },
  {
    status: "open",
    sender: "kim@example.com",
    message: "I was charged twice this month. Please refund the extra charge.",
  },
  { status: "closed", sender: "kim@example.com", message: "Thanks, all good now!" },
];

const decisions = [];
for (const ticket of tickets) {
  decisions.push({ message: ticket.message, ...(await triage(ticket, customer)) });
}
show(decisions, "Triage results");
