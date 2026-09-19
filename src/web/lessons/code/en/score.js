const report =
  "The export button crashes the settings page in Safari. " +
  "It works in Chrome, but a few of our customers only use Safari.";

const res = await jev({
  state: report,
  questions: {
    severity: score("How severe is the reported issue?", [
      "Cosmetic; no impact to functionality",
      "Broken or degraded feature, but workaround exists",
      "Blocking issue; no workaround exists",
    ]),
    // For comparison: levels that are only numbers
    severity_numbers_only: score("Rate severity from 0 to 2, where 2 is worst", ["0", "1", "2"]),
  },
});

const s = res.answers.severity;
// score is the sum of level number × probability
const weighted = Object.entries(s.probabilities).reduce((sum, [level, p]) => sum + Number(level) * p, 0);
print("score:", s.score, " computed from probabilities:", weighted.toFixed(2));
print("confidence:", s.confidence);
