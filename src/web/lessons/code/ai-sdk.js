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

// 同じリクエストを 2 つの経路で送る。キーが無い経路はエラーとして表に出る
const rows = [];
for (const provider of ["typesafe", "gateway"]) {
  try {
    const res = await jev({ ...request, provider });
    rows.push({
      経路: provider,
      model: res.model,
      is_urgent: res.answers.is_urgent.noul,
      team: res.answers.team.choice,
      confidence: res.answers.team.confidence,
      ミリ秒: res.meta.latencyMs,
    });
  } catch (error) {
    rows.push({ 経路: provider, エラー: error.message });
  }
}
show(rows, "TypeSafe 直と Vercel AI Gateway");
