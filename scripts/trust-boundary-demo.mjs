import { compilePolicy, evaluateRequirement } from "../src/lib/gate/policy.ts";

const policy = compilePolicy({
  intent: { pack: "high-risk", dataClass: "confidential" },
  previousCapabilities: ["filesystem.read"],
  capabilities: ["filesystem.read", "filesystem.write"],
});
const byId = new Map(policy.requirements.map((r) => [r.id, r]));
const check = (id, evidence) => evaluateRequirement(byId.get(id), evidence).status;
const results = [
  { attack: "artifact changed after evaluation", verdict: check("HF-ART-001", [{ evidenceKind: "deterministic_test", outcome: "fail", independence: "self" }]) === "fail" ? "BLOCK" : "ERROR" },
  { attack: "mandatory independent evidence removed", verdict: check("HF-IND-001", []) === "missing" ? "BLOCK" : "ERROR" },
  { attack: "LLM says PASS while deterministic proof is absent", verdict: check("HF-FS-001", [{ evidenceKind: "llm_evaluation", outcome: "pass", independence: "independent" }]) === "missing" ? "BLOCK" : "ERROR" },
  { attack: "candidate creator attempts high-risk approval", verdict: policy.approval.separateFromCreator ? "BLOCK" : "ERROR" },
];
const allAttacksBlocked = results.every((r) => r.verdict === "BLOCK");
const fixedEvidence = policy.requirements.map((r) => {
  const kind = r.allowedEvidence.find((k) => k !== "llm_evaluation" && k !== "human_approval") ?? r.allowedEvidence[0];
  const independence = r.minimumIndependence;
  return { id: r.id, status: evaluateRequirement(r, [{ evidenceKind: kind, outcome: "pass", independence }]).status };
});
const fixedGatePasses = fixedEvidence.every((r) => r.status === "pass");
console.log("HodgeForm trust-boundary demo\n");
for (const r of results) console.log(`${r.verdict.padEnd(7)} ${r.attack}`);
console.log(`\n${fixedGatePasses ? "RELEASE" : "BLOCK"}   restored admissible evidence + separate authorized approver`);
console.log("\nBoundary: this demonstrates configured gate semantics; it is not a universal safety certificate.");
if (!allAttacksBlocked || !fixedGatePasses) process.exit(1);
