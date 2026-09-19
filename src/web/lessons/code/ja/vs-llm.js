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

// 同じ state と質問を、Jev と小型 LLM に並行して渡す
const LLM_MODEL = "openai/gpt-5.6-luna";
const [j, l] = await Promise.all([jev({ state, questions }), llm.evaluate({ model: LLM_MODEL, state, questions })]);

const row = (res) => ({
  モデル: res.model,
  ミリ秒: res.meta.latencyMs,
  費用USD: res.meta.costUsd,
  出力トークン: res.usage.output_tokens,
  department: res.answers.department.choice,
  "department の分布": res.answers.department.probabilities ? "あり" : "なし",
  frustration: Number(res.answers.frustration.score.toFixed(2)),
  refund_requested: res.answers.refund_requested.noul,
});

show([row(j), row(l)], "Jev と小型 LLM");
