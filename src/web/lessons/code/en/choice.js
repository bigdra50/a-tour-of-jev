const ticket = "My running shoes arrived in the wrong size, and I was charged twice for them.";

const res = await jev({
  state: ticket,
  questions: {
    department: choice("Which team should handle this?", {
      returns: "Exchanges, refunds, wrong or damaged items",
      shipping: "Delivery status, delays, lost packages",
      billing: "Charges, invoices, payment problems",
    }),
  },
});

const d = res.answers.department;
print("Chosen option:", d.choice);
print("confidence:", d.confidence);
print("probabilities:", d.probabilities);
