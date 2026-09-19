const ticket =
  "Since the last update, exporting to PDF fails with a spinner that never finishes. " +
  "Steps: open any report, click Export, choose PDF. Chrome 128 on macOS. " +
  "This is the third time I've reported a bug like this.";

// 結果次第で要らなくなる質問（投機的な質問）も、最初からまとめて聞く
const questions = {
  category: choice("What kind of ticket is this?", {
    bug_report: "Something is broken",
    billing: "Charges, invoices, refunds",
    feature_request: "Asks for something new",
  }),
  bug_severity: score("If this is a bug report, how severe is it?", [
    "Cosmetic; no impact to functionality",
    "Broken or degraded feature, but workaround exists",
    "Blocking issue; no workaround exists",
  ]),
  has_repro_steps: noul("Does the ticket describe steps to reproduce the problem?"),
  refund_requested: noul("Does the customer ask for a refund?"),
  frustration: score("How frustrated is the customer?", [
    "Calm, just stating facts",
    "Frustrated but civil",
    "Very angry, strong language or threatening to leave",
  ]),
};

// 1) まとめて 1 回で聞く
const batchStart = performance.now();
const batched = await jev({ state: ticket, questions });
const batchMs = performance.now() - batchStart;

// 2) 1 問ずつ順番に聞く
const sequentialStart = performance.now();
let sequentialTokens = 0;
for (const [id, question] of Object.entries(questions)) {
  const one = await jev({ state: ticket, questions: { [id]: question } });
  sequentialTokens += one.usage.input_tokens;
}
const sequentialMs = performance.now() - sequentialStart;

show(
  [
    { 聞き方: "まとめて 1 回", 呼び出し回数: 1, 入力トークン: batched.usage.input_tokens, ミリ秒: Math.round(batchMs) },
    {
      聞き方: "1 問ずつ",
      呼び出し回数: Object.keys(questions).length,
      入力トークン: sequentialTokens,
      ミリ秒: Math.round(sequentialMs),
    },
  ],
  "まとめて聞く vs 1 問ずつ聞く",
);

// 使うかどうかはコードが決める。バグ報告でなければ bug_severity は読まない
const a = batched.answers;
if (a.category.choice === "bug_report" && a.bug_severity.score > 1.5 && a.has_repro_steps.noul > 0.6) {
  print("→ エンジニアに急ぎでエスカレーション");
} else if (a.category.choice === "bug_report") {
  print("→ バグのバックログへ");
} else {
  print(`→ ${a.category.choice} の担当へ`);
}
