const email = {
  sender: { display_name: "Acme Payroll", email: "bonus@claim-reward.example" },
  message: "Congratulations! You were selected for a $1,000 bonus. " + "Reply with your password to receive it today.",
};

const res = await jev({
  state: email,
  questions: {
    // The broad question (kept for comparison)
    is_spam: noul("Is this email spam?"),
    // Split into questions that each look at a single property
    requests_credentials: noul("Does `message` ask the recipient to disclose a password or other credential?"),
    sender_mismatch: noul(
      "Does `sender.display_name` claim an organization unrelated to the domain of `sender.email`?",
    ),
    unexpected_reward: noul("Does `message` announce an unrequested prize, payment, or reward?"),
  },
});

const a = res.answers;

// The code owns the weights. If the result disagrees with your team's judgment, change them here, not the prompt
const WEIGHTS = { requests_credentials: 0.45, sender_mismatch: 0.3, unexpected_reward: 0.25 };
const spamRisk = Object.entries(WEIGHTS).reduce((sum, [id, w]) => sum + w * a[id].noul, 0);

show(
  {
    "Broad question is_spam": a.is_spam.noul,
    requests_credentials: a.requests_credentials.noul,
    sender_mismatch: a.sender_mismatch.noul,
    unexpected_reward: a.unexpected_reward.noul,
    "Combined spam_risk": Number(spamRisk.toFixed(3)),
  },
  "The broad question vs. the split questions combined",
);
