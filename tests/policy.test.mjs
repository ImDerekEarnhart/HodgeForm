import assert from "node:assert/strict";
import test from "node:test";
import { compilePolicy, evaluateRequirement } from "../src/lib/gate/policy.ts";

test("semantic authority expansion compiles new obligations", () => {
  const p = compilePolicy({ intent: { pack: "basic", dataClass: "internal" }, previousCapabilities: ["filesystem.read"], capabilities: ["filesystem.read", "filesystem.write"] });
  assert.deepEqual(p.addedCapabilities, ["filesystem.write"]);
  assert.ok(p.requirements.some((r) => r.id === "HF-FS-001" && r.source === "semantic_diff"));
  assert.equal(p.approval.separateFromCreator, true);
});

test("LLM pass cannot satisfy a blocking obligation, but LLM counterexample can fail it", () => {
  const r = { id:"X", title:"x", reason:"x", allowedEvidence:["llm_evaluation","deterministic_test"], minimumIndependence:"self", blocking:true, source:"pack" };
  assert.equal(evaluateRequirement(r, [{ requirementId:"X", evidenceKind:"llm_evaluation", outcome:"pass", independence:"self" }]).status, "missing");
  assert.equal(evaluateRequirement(r, [{ requirementId:"X", evidenceKind:"llm_evaluation", outcome:"fail", independence:"self" }]).status, "fail");
  assert.equal(evaluateRequirement(r, [{ requirementId:"X", evidenceKind:"deterministic_test", outcome:"pass", independence:"self" }]).status, "pass");
});

test("critical capability cannot opt out of four-eyes approval", () => {
  const p = compilePolicy({ intent: { pack:"basic", dataClass:"internal", separateApprover:false }, capabilities:["payment.execute"] });
  assert.equal(p.risk,"critical"); assert.equal(p.approval.separateFromCreator,true);
  assert.ok(p.requirements.some((r)=>r.id==="HF-PAY-001" && r.minimumIndependence==="independent"));
});

test("release-key fingerprint hashes DER bytes rather than object serialization", async () => {
  const { generateReleaseKeys, sha256 } = await import("../src/lib/gate/crypto.server.ts");
  const { createPublicKey } = await import("node:crypto");
  const k=generateReleaseKeys();
  assert.equal(k.fingerprint, sha256(createPublicKey(k.publicKeyPem).export({type:"spki",format:"der"})));
});

test("organization policy packs can only add obligations", () => {
  const p = compilePolicy({
    intent: { pack: "basic", dataClass: "internal", separateApprover: false },
    capabilities: [],
    organizationPacks: ["high-risk"],
    forceSeparateApprover: true,
  });
  assert.deepEqual(p.organizationPacks, ["high-risk"]);
  assert.ok(p.requirements.some((r) => r.id === "HF-IND-001" && r.source === "organization"));
  assert.equal(p.approval.separateFromCreator, true);
});

test("workspace release authority is role- and risk-aware", async () => {
  const { roleCanApproveRisk } = await import("../src/lib/gate/authorization.ts");
  assert.equal(roleCanApproveRisk("member", "low"), true);
  assert.equal(roleCanApproveRisk("member", "medium"), true);
  assert.equal(roleCanApproveRisk("member", "high"), false);
  assert.equal(roleCanApproveRisk("member", "critical"), false);
  assert.equal(roleCanApproveRisk("admin", "high"), true);
  assert.equal(roleCanApproveRisk("owner", "critical"), true);
});

test("workspace can never remove or demote its last owner", async () => {
  const { canRemoveOrDemoteOwner } = await import("../src/lib/gate/authorization.ts");
  assert.equal(canRemoveOrDemoteOwner("owner", 1), false);
  assert.equal(canRemoveOrDemoteOwner("owner", 2), true);
  assert.equal(canRemoveOrDemoteOwner("admin", 1), true);
  assert.equal(canRemoveOrDemoteOwner("member", 1), true);
});
