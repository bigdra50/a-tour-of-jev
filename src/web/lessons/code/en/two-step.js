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

// Call 1: pick the department. With the subtree in each option's description, the model can see what lies under each branch
const first = await jev({
  state: { listing },
  questions: { department: choice("Which department does `listing` belong to?", TAXONOMY) },
});
const department = first.answers.department;

// Call 2: pick from the child categories of that department. These options cannot be built without the first answer
const children = TAXONOMY[department.choice];
const second = await jev({
  state: { listing },
  questions: { category: choice(`Which ${department.choice} category does \`listing\` belong to?`, children) },
});

show({
  Path: [department.choice, second.answers.category.choice],
  "Department probabilities": department.probabilities,
  "Category probabilities": second.answers.category.probabilities,
});
