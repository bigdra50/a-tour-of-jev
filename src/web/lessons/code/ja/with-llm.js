const message = "Hi, my order A-104 arrived damaged. The box was crushed. Can I get a replacement?";
const LLM_MODEL = "openai/gpt-5.6-luna";

// 1. Jev で振り分ける（速くて安い。文章は書かない）
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
  show("人の担当者へ回す（LLM は呼ばない）");
} else {
  // 2. 返信文の生成は LLM に任せる
  const draft = await llm.generate({
    model: LLM_MODEL,
    system: "You are a concise, friendly support agent. Reply in 2-3 sentences.",
    prompt: `Intent: ${route.answers.intent.choice}\nCustomer message: ${message}`,
    maxOutputTokens: 200,
  });

  // 3. 生成した文を Jev で検査する（出力側のガードレール）
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
    振り分け: route.answers.intent.choice,
    返信案: draft.text,
    規約違反の確率: guard.answers.breaks_policy.noul,
    依頼に答えている確率: guard.answers.answers_request.noul,
    ミリ秒: {
      "Jev 振り分け": route.meta.latencyMs,
      "LLM 生成": draft.meta.latencyMs,
      "Jev 検査": guard.meta.latencyMs,
    },
  });
}
