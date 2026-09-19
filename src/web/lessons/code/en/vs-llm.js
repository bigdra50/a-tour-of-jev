const state = "My running shoes arrived in the wrong size, and I was charged twice for them.";

const questions = {
  department: choice("Which team should handle this?", {
    returns: "Exchanges, refunds, wrong or damaged items",
    shipping: "Delivery status, delays, lost packages",
    billing: "Charges, invoices, payment problems",
  }),
  frustration: score("How frustrated is the customer?", [
    "Calm, just stating facts",
    "Frustrated but civil",
    "Very angry, strong language or threatening to leave",
  ]),
  refund_requested: noul("Does the customer explicitly ask for a refund?"),
};

// Pass the same state and questions to Jev and to a small LLM, in parallel
const LLM_MODEL = "openai/gpt-5.6-luna";
const [j, l] = await Promise.all([jev({ state, questions }), llm.evaluate({ model: LLM_MODEL, state, questions })]);

const row = (res) => ({
  model: res.model,
  ms: res.meta.latencyMs,
  "cost USD": res.meta.costUsd,
  "output tokens": res.usage.output_tokens,
  department: res.answers.department.choice,
  "department distribution": res.answers.department.probabilities ? "yes" : "no",
  frustration: Number(res.answers.frustration.score.toFixed(2)),
  refund_requested: res.answers.refund_requested.noul,
});

show([row(j), row(l)], "Jev and a small LLM");
