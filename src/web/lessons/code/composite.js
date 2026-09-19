const QUESTIONS = {
  severity: score("How severe is the reported issue?", [
    "Cosmetic; no impact to functionality",
    "Broken or degraded feature, but workaround exists",
    "Blocking issue; no workaround exists",
  ]),
  frustration: score("How frustrated is the customer?", [
    "Calm, just stating facts",
    "Frustrated but civil",
    "Very angry, strong language or threatening to leave",
  ]),
  report_quality: score("How much does the report give an engineer to work with?", [
    "No detail; just says something is broken",
    "Names the feature but no steps or environment",
    "Steps to reproduce or environment, but not both",
    "Steps to reproduce and environment",
  ]),
};

// 重みはコードの定数。並び順がチームの判断と合わなければ、ここを変える
const WEIGHTS = { severity: 0.6, frustration: 0.3, report_quality: 0.1 };

const tickets = [
  "Export to PDF fails with a spinner that never finishes. Steps: open a report, click Export, choose PDF. " +
    "Chrome 128 on macOS. This is the third time I'm reporting this. I'm done.",
  "The export icon is slightly misaligned on the settings page.",
  "Nobody on our team can log in since this morning. We get a 500 error on every attempt.",
];

// レベル数の違う Score を 0〜1 にそろえる: score / (レベル数 - 1)
const normalized = (answers, id) => answers[id].score / (QUESTIONS[id].criteria.length - 1);

const rows = await Promise.all(
  tickets.map(async (ticket) => {
    const { answers } = await jev({ state: ticket, questions: QUESTIONS });
    const parts = Object.fromEntries(
      Object.keys(WEIGHTS).map((id) => [id, Number(normalized(answers, id).toFixed(2))]),
    );
    const priority = Object.entries(WEIGHTS).reduce((sum, [id, weight]) => sum + weight * parts[id], 0);
    return { ticket: `${ticket.slice(0, 36)}…`, ...parts, priority: Number(priority.toFixed(3)) };
  }),
);

show(
  rows.sort((a, b) => b.priority - a.priority),
  "優先度の高い順",
);
