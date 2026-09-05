/** Drafting aids only: templates do not verify a claim or change release authority. */
export const discoveryTemplates = [
  {
    id: "representation",
    label: "Diagnose a representation limit",
    claim: "Frozen representation and permitted operations:\n\nCases the representation cannot distinguish:\n\nDifferent target outcomes and measurement uncertainty:\n\nEvidence scope (observed cases, exhaustive finite check, or checked theorem):\n\nAlternative explanations and a discriminating test:\n\nWhat would refute this diagnosis:\n\nSearch budget exhaustion alone does not establish a representation limit.",
  },
  {
    id: "operator",
    label: "Propose a new operator",
    claim: "Parent diagnosis and bounded problem:\n\nProposed observable, primitive, or memory operator:\n\nCompeting explanations or operators still consistent with the evidence:\n\nFrozen baseline, data split, and equal evaluation budgets:\n\nFresh test that distinguishes the alternatives:\n\nRequired improvement and per-case regression limits:\n\nKill switch or ablation; failure and inconclusive criteria:\n\nNew read, write, network, or execution permissions (if any):",
  },
  {
    id: "experiment",
    label: "Plan a frozen experiment",
    claim: "Bounded hypothesis and scope:\n\nProtocol, artifact, data, and evaluator hashes:\n\nFreeze record and whether outcomes have already been inspected:\n\nPrimary metric, threshold, baseline, and compute budget:\n\nNull controls and dependence groups:\n\nStopping rule, error handling, and treatment of missing runs:\n\nIndependent verification and fresh holdout plan:\n\nSecondary analyses (cannot rescue a failed primary):",
  },
  {
    id: "refutation",
    label: "Preserve a refutation",
    claim: "Parent claim and its original scope:\n\nFrozen criterion that failed:\n\nCounterexample, negative result, or implementation failure:\n\nEvidence references and reproduction details:\n\nWhat is refuted, inconclusive, or still supported:\n\nProposed narrower claim (requires a new prospective test):\n\nRetain the original result and failed branches; do not move the original threshold.",
  },
] as const;
