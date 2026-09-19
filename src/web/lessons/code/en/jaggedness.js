const items = ["typesafe", "apple", "california", "banana", "likes", "calibration", "orange", "vertex"];

// The weak way: ask for the count directly
const direct = await jev({
  state: { items },
  questions: {
    fruit_count: choice(
      "How many entries in `items` are names of fruits?",
      Object.fromEntries(["0", "1", "2", "3", "4", "5", "6", "7", "8"].map((n) => [n, null])),
    ),
  },
});

// The strong way: ask about each item with a Noul, and let code do the counting
const perItem = await jev({
  state: { items },
  questions: Object.fromEntries(items.map((_, i) => [`item_${i}`, noul(`Is \`items[${i}]\` the name of a fruit?`)])),
});

const YES = 0.5; // choose the threshold for your use case
const fruits = items.filter((_, i) => perItem.answers[`item_${i}`].noul > YES);

show({
  "Count when asked directly": direct.answers.fruit_count.choice,
  "confidence when asked directly": direct.answers.fruit_count.confidence,
  "Count from asking one by one": fruits.length,
  "Judged to be fruits": fruits,
});
