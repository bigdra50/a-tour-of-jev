const items = ["typesafe", "apple", "california", "banana", "likes", "calibration", "orange", "vertex"];

// 苦手な聞き方: 数をそのまま聞く
const direct = await jev({
  state: { items },
  questions: {
    fruit_count: choice(
      "How many entries in `items` are names of fruits?",
      Object.fromEntries(["0", "1", "2", "3", "4", "5", "6", "7", "8"].map((n) => [n, null])),
    ),
  },
});

// 得意な聞き方: 1 つずつ Noul で聞き、数えるのはコードに任せる
const perItem = await jev({
  state: { items },
  questions: Object.fromEntries(items.map((_, i) => [`item_${i}`, noul(`Is \`items[${i}]\` the name of a fruit?`)])),
});

const YES = 0.5; // しきい値は用途で決める
const fruits = items.filter((_, i) => perItem.answers[`item_${i}`].noul > YES);

show({
  数を直接聞いた答え: direct.answers.fruit_count.choice,
  "直接聞いたときの confidence": direct.answers.fruit_count.confidence,
  "1 つずつ聞いてコードで数えた数": fruits.length,
  果物と判定したもの: fruits,
});
