// state（判断の材料）と questions（判断してほしいこと）を渡して、型つきの答えを受け取る
const res = await jev({
  state: "Help! My payouts have been failing for 3 days.",
  questions: {
    is_urgent: noul("Does this message convey urgency?"),
  },
});

// noul は「yes である確率」（0〜1）
print("is_urgent =", res.answers.is_urgent.noul);
print("答えたモデル:", res.model);
print("トークン:", res.usage);
