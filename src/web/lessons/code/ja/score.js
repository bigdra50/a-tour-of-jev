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
    // 比べるため: レベルを番号だけにしたもの
    severity_numbers_only: score("Rate severity from 0 to 2, where 2 is worst", ["0", "1", "2"]),
  },
});

const s = res.answers.severity;
// score は「レベル番号 × 確率」の合計
const weighted = Object.entries(s.probabilities).reduce((sum, [level, p]) => sum + Number(level) * p, 0);
print("score:", s.score, " 確率から計算:", weighted.toFixed(2));
print("confidence:", s.confidence);
