// Pass a state (what to judge) and questions (what you want judged), and get typed answers back
const res = await jev({
  state: "Help! My payouts have been failing for 3 days.",
  questions: {
    is_urgent: noul("Does this message convey urgency?"),
  },
});

// noul is the probability of "yes" (0 to 1)
print("is_urgent =", res.answers.is_urgent.noul);
print("Answered by:", res.model);
print("Tokens:", res.usage);
