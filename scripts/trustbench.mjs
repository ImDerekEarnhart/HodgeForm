import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { compilePolicy, evaluateRequirement } from "../src/lib/gate/policy.ts";

const here = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(await readFile(resolve(here, "../benchmarks/trustbench-v0.1.json"), "utf8"));
let exact = 0;
const rows = [];
for (const c of spec.cases) {
  const policy = compilePolicy({ intent: c.intent, capabilities: c.capabilities, previousCapabilities: c.previousCapabilities });
  const semanticIds = policy.requirements.filter((r) => r.source === "semantic_diff").map((r) => r.id).sort();
  const expectedIds = [...c.expectedSemanticRequirementIds].sort();
  const pass = JSON.stringify(policy.addedCapabilities) === JSON.stringify(c.expectedAddedCapabilities)
    && JSON.stringify(semanticIds) === JSON.stringify(expectedIds)
    && policy.risk === c.expectedRisk;
  if (pass) exact += 1;
  rows.push({ id: c.id, pass, added: policy.addedCapabilities, semanticRequirementIds: semanticIds, risk: policy.risk });
}

const requirement = {
  id: "TB-EVIDENCE",
  title: "Deterministic boundary",
  reason: "Benchmark evidence rule",
  allowedEvidence: ["deterministic_test", "llm_evaluation", "independent_verifier"],
  minimumIndependence: "independent",
  blocking: true,
  source: "baseline",
};
const evidenceChecks = [
  { id: "llm-pass-is-not-authority", expected: "missing", actual: evaluateRequirement(requirement, [{ evidenceKind: "llm_evaluation", outcome: "pass", independence: "independent" }]).status },
  { id: "llm-counterexample-blocks", expected: "fail", actual: evaluateRequirement(requirement, [{ evidenceKind: "llm_evaluation", outcome: "fail", independence: "independent" }]).status },
  { id: "same-team-cannot-satisfy-independent", expected: "missing", actual: evaluateRequirement(requirement, [{ evidenceKind: "deterministic_test", outcome: "pass", independence: "same_team" }]).status },
  { id: "independent-deterministic-pass", expected: "pass", actual: evaluateRequirement(requirement, [{ evidenceKind: "deterministic_test", outcome: "pass", independence: "independent" }]).status },
];
const evidenceExact = evidenceChecks.filter((c) => c.actual === c.expected).length;
const result = {
  schema: "hodgeform-trustbench-result/0.1",
  authorityObligationExact: exact,
  authorityObligationTotal: spec.cases.length,
  authorityObligationAccuracy: exact / spec.cases.length,
  evidenceAdmissibilityExact: evidenceExact,
  evidenceAdmissibilityTotal: evidenceChecks.length,
  evidenceAdmissibilityAccuracy: evidenceExact / evidenceChecks.length,
  rows,
  evidenceChecks,
};
console.log(JSON.stringify(result, null, 2));
if (exact !== spec.cases.length || evidenceExact !== evidenceChecks.length) process.exit(1);
