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
  "Noul（返金を求めている）": a.refund_noul.noul,
  "Noul（返金以外を求めている）": a.not_refund_noul.noul,
  "2 つの Noul の合計": Number((a.refund_noul.noul + a.not_refund_noul.noul).toFixed(2)),
  "Choice の yes の確率": a.refund_choice.probabilities.yes,
  "Choice の confidence": a.refund_choice.confidence,
});
