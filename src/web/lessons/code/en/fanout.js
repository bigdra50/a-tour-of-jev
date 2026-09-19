const ticket =
  "Since the last update, exporting to PDF fails with a spinner that never finishes. " +
  "Steps: open any report, click Export, choose PDF. Chrome 128 on macOS. " +
  "This is the third time I've reported a bug like this.";

// Ask every question up front, including ones the result may make unnecessary (speculative questions)
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

// 1) Ask everything in one call
const batchStart = performance.now();
const batched = await jev({ state: ticket, questions });
const batchMs = performance.now() - batchStart;

// 2) Ask one question at a time, in order
const sequentialStart = performance.now();
let sequentialTokens = 0;
for (const [id, question] of Object.entries(questions)) {
  const one = await jev({ state: ticket, questions: { [id]: question } });
  sequentialTokens += one.usage.input_tokens;
}
const sequentialMs = performance.now() - sequentialStart;

show(
  [
    { approach: "all at once", calls: 1, "input tokens": batched.usage.input_tokens, ms: Math.round(batchMs) },
    {
      approach: "one at a time",
      calls: Object.keys(questions).length,
      "input tokens": sequentialTokens,
      ms: Math.round(sequentialMs),
    },
  ],
  "All at once vs one at a time",
);

// Your code decides what to use. If it is not a bug report, bug_severity is never read
const a = batched.answers;
if (a.category.choice === "bug_report" && a.bug_severity.score > 1.5 && a.has_repro_steps.noul > 0.6) {
  print("→ Escalate to engineering right away");
} else if (a.category.choice === "bug_report") {
  print("→ Add to the bug backlog");
} else {
  print(`→ Send to the ${a.category.choice} team`);
}
