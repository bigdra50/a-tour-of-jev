const claim =
  "Rear-ended at a red light on Tuesday. The other driver admitted fault at the scene. " +
  "Bumper and trunk are damaged; photos attached.";

const questions = {
  other_at_fault: noul("Does the claim say the other driver was at fault?"),
  has_evidence: noul("Does the claimant mention supporting evidence such as photos or a police report?"),
  reports_injury: noul("Does the claim report an injury?"),
};

// As in the official experiment, put a throwaway uid in the state each time so every request is separate
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
      question: id,
      mean: Number(mean(values).toFixed(3)),
      stdev: Number(stdev(values).toFixed(4)),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }),
  `The same questions ${N} times`,
);
