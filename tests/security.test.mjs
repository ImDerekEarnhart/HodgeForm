import assert from "node:assert/strict"; import fs from "node:fs"; import test from "node:test";
const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
test("release authority is hash-bound, transactional and server-authoritative",()=>{const s=read("src/lib/gate/service.server.ts");assert.match(s,/withTransaction/);assert.match(s,/for update/);assert.match(s,/Frozen policy hash mismatch/);assert.match(s,/signReceipt\(receiptPayload\)/);assert.match(s,/insert into release_receipts/);});
test("public mode fails closed on auth db TLS and signing keys",()=>{const s=read("src/lib/gate/config.server.ts");for(const x of ["authentication is disabled","DATABASE_URL is missing","BETTER_AUTH_SECRET","BETTER_AUTH_URL must be https","Ed25519 receipt signing keys"])assert.match(s,new RegExp(x));});
test("web process cannot spawn model-generated code",()=>{const s=read("src/lib/runtime/sandbox.server.ts");assert.doesNotMatch(s,/node:child_process|\bspawn\s*\(|execFile\s*\(/);const c=read("docker-compose.production.yml");assert.match(c,/network_mode:\s*none/);assert.match(c,/no-new-privileges:true/);assert.match(c,/read_only:\s*true/);});
test("paid model fallback remains opt-in",()=>{const s=read("src/lib/runtime/model-provider.server.ts");assert.match(s,/HODGEFORM_ALLOW_XAI_FALLBACK/);assert.match(s,/false\)/);assert.match(s,/\/chat\/completions/);});
test("every product data query is tenant scoped by construction",()=>{const m=read("migrations/0002_gate.sql");for(const table of ["repositories","release_candidates","gate_plans","evidence_receipts","approvals","release_receipts","discovery_commits"])assert.match(m,new RegExp(`create table if not exists ${table}[\\s\\S]*?tenant_id text not null`));const t=read("src/lib/gate/tenant.server.ts");assert.match(t,/workspace_members/);assert.match(t,/workspace:\$\{workspaceId\}/);assert.match(t,/HODGEFORM_PRIVATE_TENANT_ID/);});
test("LLM verdicts are evidence, never deterministic release authority",()=>{const p=read("src/lib/gate/policy.ts");assert.match(p,/e\.evidenceKind !== "llm_evaluation"/);assert.match(p,/Models propose evidence; policy decides/);});

test("CI token surface cannot perform human release approval",()=>{const routeFiles=[
  "src/routes/api/v1/repositories.ts",
  "src/routes/api/v1/candidates.ts",
  "src/routes/api/v1/candidates/$id.ts",
  "src/routes/api/v1/candidates/$id/evidence.ts",
  "src/routes/api/v1/candidates/$id/receipt.ts",
];for(const f of routeFiles)assert.doesNotMatch(read(f),/decideRelease|APPROVAL_PHRASE|insert into approvals/i,`${f} must not expose approval authority`);const receipt=read("src/routes/api/v1/candidates/$id/receipt.ts");assert.match(receipt,/authenticateApiRequest/);assert.match(receipt,/auth\.tenantId/);});

test("workspace authorization makes high-risk approval role-gated",()=>{const t=read("src/lib/gate/tenant.server.ts");assert.match(t,/roleCanApproveRisk/);assert.match(t,/High-risk releases require a workspace owner or admin approver/);const a=read("src/lib/gate/authorization.ts");assert.match(a,/risk === "high" \|\| risk === "critical"/);});

test("special evidence labels cannot self-assert stronger epistemic status",()=>{const s=read("src/lib/gate/service.server.ts");assert.match(s,/Formal proof evidence requires a registered proof-verifier adapter/);assert.match(s,/Independent verifier evidence requires an active registered independent verifier principal bound to the API token/);assert.match(s,/resolveVerifierPrincipal/);const p=read("src/lib/gate/policy.ts");assert.doesNotMatch(p,/HF-IND-001[\s\S]{0,300}formal_proof/);});

test("evidence independence is derived by the server, not caller input",()=>{const api=read("src/lib/gate/api.ts");assert.doesNotMatch(api,/outcome:[\s\S]{0,100}independence:\s*z\.enum/);const s=read("src/lib/gate/service.server.ts");assert.match(s,/userId === candidate\.created_by \? "self" : "same_team"/);assert.match(s,/verifier\?\.trustLevel/);});

test("local model red-team assistance is proposal-only",()=>{const s=read("src/lib/gate/service.server.ts");const start=s.indexOf("export async function proposeAdversarialChecks");const end=s.indexOf("export async function recordEvidence",start);const body=s.slice(start,end);assert.match(body,/teacherChat/);assert.match(body,/Model output is a proposal only/);assert.doesNotMatch(body,/insert into evidence_receipts|update release_candidates|insert into approvals|signReceipt/);});

test("capability inventory evidence is artifact-bound and fail-closed",()=>{const s=read("src/lib/gate/service.server.ts");assert.match(s,/scanArtifactHash !== candidate\.artifact_hash/);assert.match(s,/input\.payload\.complete !== true/);assert.match(s,/undeclared\.length > 0/);});

test("reference executor enforces its configured service token",()=>{const s=read("executor/server.py");assert.match(s,/HODGEFORM_SANDBOX_TOKEN/);assert.match(s,/authorization/);assert.match(s,/unauthorized/);});

test("repository API is workspace-scoped and CLI-native",()=>{const r=read("src/routes/api/v1/repositories.ts");assert.match(r,/authenticateApiRequest/);assert.match(r,/auth\.tenantId/);const c=read("bin/hodgeform.mjs");assert.match(c,/repository create/);assert.match(c,/repository list/);});

test("release authority rejects mismatched signing keys and stores only confirmation hash",()=>{const c=read("src/lib/gate/crypto.server.ts");assert.match(c,/public\/private keys do not form a valid pair/);assert.match(c,/createPublicKey\(privateKey\)/);const s=read("src/lib/gate/service.server.ts");assert.match(s,/userId, sha256\(confirmation\)/);});
