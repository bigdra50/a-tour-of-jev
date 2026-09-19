const TAXONOMY = {
  "Sporting Goods": {
    Cycling: ["Bike Bottles & Cages", "Helmets", "Bike Lights"],
    Camping: ["Tents", "Sleeping Bags", "Camp Cookware"],
  },
  "Home & Kitchen": {
    Drinkware: ["Water Bottles", "Travel Mugs", "Tumblers"],
    Cookware: ["Pans", "Pots", "Bakeware"],
  },
};

const listing = "Insulated 750ml steel bottle. Fits standard bike cages and keeps drinks cold on long rides.";

// 1 回目: 部門を選ぶ。選択肢の説明に部分木を入れると、枝の下に何があるかをモデルが見られる
const first = await jev({
  state: { listing },
  questions: { department: choice("Which department does `listing` belong to?", TAXONOMY) },
});
const department = first.answers.department;

// 2 回目: 選んだ部門の子カテゴリから選ぶ。1 回目の答えがないと、この選択肢を作れない
const children = TAXONOMY[department.choice];
const second = await jev({
  state: { listing },
  questions: { category: choice(`Which ${department.choice} category does \`listing\` belong to?`, children) },
});

show({
  経路: [department.choice, second.answers.category.choice],
  部門の確率: department.probabilities,
  カテゴリの確率: second.answers.category.probabilities,
});
