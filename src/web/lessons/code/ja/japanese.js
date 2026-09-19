const variants = {
  "state も質問も英語": {
    state: "I was charged twice for my order. Please refund the extra charge as soon as possible.",
    instructions: "Which team should handle this ticket?",
    criteria: {
      billing: "Charges, invoices, refunds",
      shipping: "Delivery status, delays",
      account: "Login, profile, security",
    },
  },
  "state も質問も日本語": {
    state: "注文の代金が二重に請求されています。余分な分をできるだけ早く返金してください。",
    instructions: "このチケットはどのチームが担当すべきですか？",
    criteria: {
      billing: "請求、請求書、返金",
      shipping: "配送状況、遅延",
      account: "ログイン、プロフィール、セキュリティ",
    },
  },
  "state は日本語、質問は英語": {
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
      組み合わせ: name,
      choice: answer.choice,
      confidence: answer.confidence,
      "billing の確率": answer.probabilities.billing,
      入力トークン: res.usage.input_tokens,
    };
  }),
);

show(rows, "言語の組み合わせで比べる");
