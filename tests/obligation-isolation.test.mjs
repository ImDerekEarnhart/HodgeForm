import test from "node:test";
import assert from "node:assert/strict";
import { compilePolicy, evaluateRequirement } from "../src/lib/gate/policy.ts";

const policy = compilePolicy({ intent: { pack: "basic", dataClass: "internal" }, capabilities: [] });
const evaluate = (rows) => Object.fromEntries(policy.requirements.map(r => [r.id, evaluateRequirement(r, rows).status]));
const pass = id => ({ requirementId: id, evidenceKind: "deterministic_test", outcome: "pass", independence: "self" });

test("artifact-freeze evidence cannot release an untested candidate", () => {
  assert.deepEqual(evaluate([pass("HF-ART-001")]), { "HF-ART-001": "pass", "HF-CAP-001": "missing", "HF-REG-001": "missing" });
});
test("requirements need separate evidence and failures remain scoped", () => {
  const rows = policy.requirements.map(r => pass(r.id));
  assert.ok(Object.values(evaluate(rows)).every(s => s === "pass"));
  rows.push({ ...pass("HF-REG-001"), outcome: "fail" });
  assert.deepEqual(evaluate(rows), { "HF-ART-001": "pass", "HF-CAP-001": "pass", "HF-REG-001": "fail" });
  rows.push(pass("HF-REG-001"));
  assert.equal(evaluate(rows)["HF-REG-001"], "fail", "a later pass cannot erase a counterexample");
});
test("missing binding fails closed and assessments explain each result", () => {
  const requirement = { ...policy.requirements[0], minimumIndependence: "independent", allowedEvidence: ["deterministic_test", "llm_evaluation"] };
  const row = { ...pass(requirement.id), independence: "independent" };
  const result = evaluateRequirement(requirement, [
    { ...row, requirementId: undefined }, { ...row, evidenceKind: "human_approval" },
    { ...row, independence: "self" }, { ...row, outcome: "inconclusive" },
    { ...row, evidenceKind: "llm_evaluation" }, row,
  ]);
  assert.deepEqual(result.assessments.map(a => a.reason), ["different_obligation", "inadmissible_kind", "insufficient_independence", "inconclusive", "model_pass_is_not_authority", "satisfies"]);
});
