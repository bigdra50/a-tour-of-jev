const ticket = "I was charged twice for the same order. Can someone look into this?";

const res = await jev({
  state: ticket,
  questions: {
    refund_noul: noul("Is the customer asking for a refund?"),
    not_refund_noul: noul("Is the customer asking for something other than a refund?"),
    refund_choice: choice("Is the customer asking for a refund?", { yes: null, no: null }),
  },
});

const a = res.answers;
show({
  "Noul (asks for a refund)": a.refund_noul.noul,
  "Noul (asks for something else)": a.not_refund_noul.noul,
  "Sum of the two Nouls": Number((a.refund_noul.noul + a.not_refund_noul.noul).toFixed(2)),
  "Choice: probability of yes": a.refund_choice.probabilities.yes,
  "Choice: confidence": a.refund_choice.confidence,
});
