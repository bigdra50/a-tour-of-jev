const ticket = "I'm not happy with the fit. What are my options here?";

const res = await jev({
  state: ticket,
  questions: {
    // As a question
    asks_refund: noul("Is the customer asking for a refund?"),
    // As a statement to judge true or false
    asks_refund_statement: noul("The customer is asking for a refund."),
    // Spell out what yes and no mean with criteria
    asks_refund_defined: noul("Is the customer asking for a refund?", {
      true: "Explicitly asks for money back",
      false: "Asks about options, exchanges, or information without requesting money back",
    }),
  },
});

for (const [id, answer] of Object.entries(res.answers)) {
  print(id.padEnd(24), answer.noul.toFixed(2));
}
