// The Japanese state below says the same thing as the English one.
// It stays in Japanese on purpose: this lesson compares how Jev handles each language.
const variants = {
  "English state and questions": {
    state: "I was charged twice for my order. Please refund the extra charge as soon as possible.",
    instructions: "Which team should handle this ticket?",
    criteria: {
      billing: "Charges, invoices, refunds",
      shipping: "Delivery status, delays",
      account: "Login, profile, security",
    },
  },
  "Japanese state and questions": {
    state: "注文の代金が二重に請求されています。余分な分をできるだけ早く返金してください。",
    instructions: "このチケットはどのチームが担当すべきですか？",
    criteria: {
      billing: "請求、請求書、返金",
      shipping: "配送状況、遅延",
      account: "ログイン、プロフィール、セキュリティ",
    },
  },
  "Japanese state, English questions": {
    state: "注文の代金が二重に請求されています。余分な分をできるだけ早く返金してください。",
    instructions: "Which team should handle this ticket?",
    criteria: {
      billing: "Charges, invoices, refunds",
      shipping: "Delivery status, delays",
      account: "Login, profile, security",
    },
  },
};

const rows = await Promise.all(
  Object.entries(variants).map(async ([name, v]) => {
    const res = await jev({ state: v.state, questions: { team: choice(v.instructions, v.criteria) } });
    const answer = res.answers.team;
    return {
      combination: name,
      choice: answer.choice,
      confidence: answer.confidence,
      "billing probability": answer.probabilities.billing,
      "input tokens": res.usage.input_tokens,
    };
  }),
);

show(rows, "Comparing language combinations");
