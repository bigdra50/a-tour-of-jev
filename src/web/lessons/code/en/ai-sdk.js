const request = {
  state: "Help! My payouts have been failing for 3 days.",
  questions: {
    is_urgent: noul("Does this message convey urgency?"),
    team: choice("Which team should handle this?", {
      billing: "Payments, payouts, invoices",
      technical: "Bugs, outages, integrations",
    }),
  },
};

// Send the same request over both routes. A route without a key shows up as an error in the table
const rows = [];
for (const provider of ["typesafe", "gateway"]) {
  try {
    const res = await jev({ ...request, provider });
    rows.push({
      route: provider,
      model: res.model,
      is_urgent: res.answers.is_urgent.noul,
      team: res.answers.team.choice,
      confidence: res.answers.team.confidence,
      ms: res.meta.latencyMs,
    });
  } catch (error) {
    rows.push({ route: provider, error: error.message });
  }
}
show(rows, "TypeSafe API and Vercel AI Gateway");
