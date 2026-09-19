const claim =
  "Rear-ended at a red light on Tuesday. The other driver admitted fault at the scene. " +
  "Bumper and trunk are damaged; photos attached.";

const questions = {
  other_at_fault: noul("Does the claim say the other driver was at fault?"),
  has_evidence: noul("Does the claimant mention supporting evidence such as photos or a police report?"),
  reports_injury: noul("Does the claim report an injury?"),
};

// 公式の実験と同じく、毎回 state に使い捨ての uid を入れて、別々のリクエストにする
const N = 10;
const runs = await Promise.all(
  Array.from({ length: N }, (_, i) =>
    jev({ state: { uid: `${i}-${Math.random().toString(36).slice(2, 8)}`, claim }, questions }),
  ),
);

show(
  Object.keys(questions).map((id) => {
    const values = runs.map((res) => res.answers[id].noul);
    return {
      質問: id,
      平均: Number(mean(values).toFixed(3)),
      標準偏差: Number(stdev(values).toFixed(4)),
      最小: Math.min(...values),
      最大: Math.max(...values),
    };
  }),
  `同じ質問を ${N} 回`,
);
