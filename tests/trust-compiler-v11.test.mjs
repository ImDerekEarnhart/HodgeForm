import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");

test("verifier registry makes independent evidence an authenticated principal property",()=>{
  const migration=read("migrations/0005_verifier_registry.sql");
  assert.match(migration,/create table if not exists verifier_principals/);
  assert.match(migration,/trust_level text not null check\(trust_level in \('same_team','independent'\)\)/);
  assert.match(migration,/verifier_principal_id text references verifier_principals/);
  const service=read("src/lib/gate/service.server.ts");
  assert.match(service,/resolveVerifierPrincipal/);
  assert.match(service,/registered independent verifier principal bound to the API token/);
  assert.match(service,/verifier\?\.trustLevel \?\?/);
});

test("every new evidence receipt is server-bound to subject policy and requirement before hashing",()=>{
  const service=read("src/lib/gate/service.server.ts");
  for(const field of ["candidateId: candidate.id","artifactHash: candidate.artifact_hash","policyHash: plan.policy_hash","requirementId: requirement.id","verifierPrincipalId:","tokenId:"]) assert.match(service,new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  assert.match(service,/schema: "hodgeform-evidence-binding\/1"/);
  assert.match(service,/const payloadHash = sha256\(payload\)/);
});

test("machine tokens are scope-limited and still have no human approval capability",()=>{
  const keys=read("src/lib/gate/api-keys.server.ts");
  for(const scope of ["repository:read","repository:write","candidate:read","candidate:write","evidence:write","receipt:read"]) assert.match(keys,new RegExp(scope));
  assert.doesNotMatch(keys,/release:approve|approval:write|decideRelease/);
  const evidence=read("src/routes/api/v1/candidates/$id/evidence.ts");
  assert.match(evidence,/requireApiScope\(a,"evidence:write"\)/);
  assert.match(evidence,/verifierPrincipalId:a\.verifierPrincipalId/);
});

test("candidate response and UI expose the four-part trust transition explanation",()=>{
  const policy=read("src/lib/gate/policy.ts");
  assert.match(policy,/hodgeform-trust-transition\/1/);
  assert.match(policy,/typed_evidence_with_minimum_independence/);
  const service=read("src/lib/gate/service.server.ts");
  assert.match(service,/trustTransition: summarizeTrustTransition/);
  const ui=read("src/routes/gates.tsx");
  for(const label of ["What changed","What must be proven","What evidence counts","Who can approve"]) assert.match(ui,new RegExp(label));
});

test("CLI ships a reproducible fail-closed demo and TrustBench",()=>{
  for(const cmd of ["demo","benchmark"]){
    const r=spawnSync(process.execPath,[fileURLToPath(new URL("../bin/hodgeform.mjs",import.meta.url)),cmd],{encoding:"utf8"});
    assert.equal(r.status,0,`${cmd} failed: ${r.stderr}`);
    if(cmd==="demo"){assert.match(r.stdout,/BLOCK\s+artifact changed after evaluation/);assert.match(r.stdout,/RELEASE\s+restored admissible evidence/);}else{assert.match(r.stdout,/"authorityObligationAccuracy": 1/);assert.match(r.stdout,/"evidenceAdmissibilityAccuracy": 1/);}
  }
});

test("product constitution keeps the trust compiler narrow and discovery-compatible",()=>{
  const c=read("PRODUCT_CONSTITUTION.md");
  assert.match(c,/Models propose\. Evidence establishes\. Policy decides\./);
  assert.match(c,/A proposed change in trusted state cannot become trusted until/);
  assert.match(c,/Gate Policy Engine/);
  assert.match(c,/Evidence Registry/);
  assert.match(c,/Verifier SDK \/ Registry/);
  assert.match(c,/Release Authority/);
  assert.match(c,/CLI\/CI distribution/);
});

test("built-in artifact freeze evidence is bound using the same trust receipt schema",()=>{
  const service=read("src/lib/gate/service.server.ts");
  assert.match(service,/\["HF-ART-001", "hodgeform\.artifact-freeze", \{ artifactHash \}\]/);
  assert.match(service,/binding: \{ schema: "hodgeform-evidence-binding\/1", candidateId, artifactHash, policyHash, requirementId, verifierPrincipalId: null, verifierTrust: "self", tokenId: null \}/);
  assert.match(service,/const payloadHash = sha256\(payload\)/);
});
