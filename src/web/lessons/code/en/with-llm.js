const message = "Hi, my order A-104 arrived damaged. The box was crushed. Can I get a replacement?";
const LLM_MODEL = "openai/gpt-5.6-luna";

// 1. Route with Jev (fast and cheap, and it does not write text)
const route = await jev({
  state: { message },
  questions: {
    intent: choice("What does `message` need?", {
      order_status: "Where an order is, or when it arrives",
      damaged_item: "An item arrived broken or damaged",
      general_question: "Anything else that needs a written answer",
    }),
    needs_human: noul("Does `message` threaten legal action or report a safety hazard?"),
  },
});

if (route.answers.needs_human.noul >= 0.5) {
  show("Hand off to a human agent (no LLM call)");
} else {
  // 2. Leave writing the reply to the LLM
  const draft = await llm.generate({
    model: LLM_MODEL,
    system: "You are a concise, friendly support agent. Reply in 2-3 sentences.",
    prompt: `Intent: ${route.answers.intent.choice}\nCustomer message: ${message}`,
    maxOutputTokens: 200,
  });

  // 3. Check the generated text with Jev (a guardrail on the output)
  const guard = await jev({
    state: {
      message,
      reply: draft.text,
      policy: "Never promise a refund amount. Never ask for passwords.",
    },
    questions: {
      breaks_policy: noul("Does `reply` break any rule in `policy`?"),
      answers_request: noul("Does `reply` respond to the replacement request in `message`?"),
    },
  });

  show({
    intent: route.answers.intent.choice,
    "draft reply": draft.text,
    "probability it breaks policy": guard.answers.breaks_policy.noul,
    "probability it answers the request": guard.answers.answers_request.noul,
    ms: {
      "Jev routing": route.meta.latencyMs,
      "LLM generation": draft.meta.latencyMs,
      "Jev check": guard.meta.latencyMs,
    },
  });
}
