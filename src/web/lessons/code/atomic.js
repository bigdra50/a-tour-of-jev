const email = {
  sender: { display_name: "Acme Payroll", email: "bonus@claim-reward.example" },
  message: "Congratulations! You were selected for a $1,000 bonus. " + "Reply with your password to receive it today.",
};

const res = await jev({
  state: email,
  questions: {
    // 広い質問（比べるために残す）
    is_spam: noul("Is this email spam?"),
    // 1 つの性質だけを見る質問に分けたもの
    requests_credentials: noul("Does `message` ask the recipient to disclose a password or other credential?"),
    sender_mismatch: noul(
      "Does `sender.display_name` claim an organization unrelated to the domain of `sender.email`?",
    ),
    unexpected_reward: noul("Does `message` announce an unrequested prize, payment, or reward?"),
  },
});

const a = res.answers;

// 重みはコードが持つ。結果がチームの判断と合わなければ、プロンプトではなくここを変える
const WEIGHTS = { requests_credentials: 0.45, sender_mismatch: 0.3, unexpected_reward: 0.25 };
const spamRisk = Object.entries(WEIGHTS).reduce((sum, [id, w]) => sum + w * a[id].noul, 0);

show(
  {
    "広い質問 is_spam": a.is_spam.noul,
    requests_credentials: a.requests_credentials.noul,
    sender_mismatch: a.sender_mismatch.noul,
    unexpected_reward: a.unexpected_reward.noul,
    "合成した spam_risk": Number(spamRisk.toFixed(3)),
  },
  "広い質問と、分けて合成した値",
);
