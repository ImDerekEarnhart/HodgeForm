#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";

import { canonicalize, sha256 as objectHash } from "../src/lib/gate/crypto.server.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl });
const suffix = randomBytes(5).toString("hex");
const ids = {
  a: `it_a_${suffix}`,
  b: `it_b_${suffix}`,
  c: `it_c_${suffix}`,
  wa: `it_wa_${suffix}`,
  wb: `it_wb_${suffix}`,
};
const tenantA = `workspace:${ids.wa}`;
const tenantB = `workspace:${ids.wb}`;
const tokenA = `hf_live_${randomBytes(32).toString("base64url")}`;
const tokenB = `hf_live_${randomBytes(32).toString("base64url")}`;
const tokenC = `hf_live_${randomBytes(32).toString("base64url")}`;
const tokenRead = `hf_live_${randomBytes(32).toString("base64url")}`;
const tokenVerifier = `hf_live_${randomBytes(32).toString("base64url")}`;
const verifierId = `verifier_it_${suffix}`;
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const kp = generateKeyPairSync("ed25519");
const privPem = kp.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const pubPem = kp.publicKey.export({ type: "spki", format: "pem" }).toString();
const port = Number(process.env.HODGEFORM_INTEGRATION_PORT || 3311);
const base = `http://127.0.0.1:${port}`;

async function q(text, params = []) { return pool.query(text, params); }
async function seed() {
  for (const [id, name] of [[ids.a,"Alice"],[ids.b,"Bob"],[ids.c,"Carol"]]) {
    await q(`insert into "user"("id","name","email","emailVerified","createdAt","updatedAt") values($1,$2,$3,true,now(),now())`, [id,name,`${id}@example.test`]);
  }
  await q(`insert into workspaces(id,slug,name,created_by) values($1,$2,'Integration A',$3),($4,$5,'Integration B',$6)`, [ids.wa,`integration-a-${suffix}`,ids.a,ids.wb,`integration-b-${suffix}`,ids.b]);
  await q(`insert into workspace_members(workspace_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner'),($1,$5,'member')`, [ids.wa,ids.a,ids.wb,ids.b,ids.c]);
  await q(`insert into user_workspace_preferences(user_id,workspace_id) values($1,$2),($3,$4),($5,$2)`, [ids.a,ids.wa,ids.b,ids.wb,ids.c]);
  for (const [id,tenant,user,token] of [[`tok_a_${suffix}`,tenantA,ids.a,tokenA],[`tok_b_${suffix}`,tenantB,ids.b,tokenB],[`tok_c_${suffix}`,tenantA,ids.c,tokenC]]) {
    await q(`insert into api_tokens(id,tenant_id,user_id,name,token_hash,token_prefix) values($1,$2,$3,'integration',$4,$5)`, [id,tenant,user,sha256(token),token.slice(0,16)]);
  }
  await q(`insert into api_tokens(id,tenant_id,user_id,name,token_hash,token_prefix,scopes_json) values($1,$2,$3,'read-only',$4,$5,$6::jsonb)`, [`tok_read_${suffix}`,tenantA,ids.a,sha256(tokenRead),tokenRead.slice(0,16),JSON.stringify(["repository:read"])]);
  await q(`insert into verifier_principals(id,tenant_id,name,trust_level,allowed_evidence_kinds_json,created_by) values($1,$2,$3,'independent',$4::jsonb,$5)`, [verifierId,tenantA,"Independent integration verifier",JSON.stringify(["deterministic_test","independent_verifier"]),ids.a]);
  await q(`insert into api_tokens(id,tenant_id,user_id,name,token_hash,token_prefix,verifier_principal_id,scopes_json) values($1,$2,$3,'verifier',$4,$5,$6,$7::jsonb)`, [`tok_verifier_${suffix}`,tenantA,ids.a,sha256(tokenVerifier),tokenVerifier.slice(0,16),verifierId,JSON.stringify(["candidate:read","evidence:write","receipt:read"])]);
}
async function cleanup() {
  try {
    await q(`delete from api_tokens where user_id = any($1::text[])`, [[ids.a,ids.b,ids.c]]);
    await q(`delete from verifier_jobs where tenant_id=$1`,[tenantA]);
    await q(`delete from verifier_workers where tenant_id=$1`,[tenantA]);
    await q(`delete from verifier_principals where id=$1`, [verifierId]);
    await q(`delete from workspaces where id = any($1::text[])`, [[ids.wa,ids.wb]]);
    await q(`delete from "user" where id = any($1::text[])`, [[ids.a,ids.b,ids.c]]);
  } catch { /* Preserve the original test failure if best-effort cleanup cannot run. */ }
  await pool.end();
}
async function request(token, path, options = {}) {
  const res = await fetch(`${base}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "content-type": "application/json" } : {}), ...(options.headers || {}) } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, headers: res.headers };
}
async function waitReady() {
  for (let i=0;i<100;i++) {
    try { const r = await fetch(`${base}/api/ready`); if (r.status === 200) return; } catch { /* Retry while the application starts. */ }
    await sleep(100);
  }
  throw new Error("application did not become ready");
}

let child;
try {
  await seed();
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port), HOST: "127.0.0.1",
    HODGEFORM_PUBLIC_RELEASE: "true",
    VITE_AUTH_ENABLED: "true",
    HODGEFORM_EMAIL_PASSWORD_AUTH: "true",
    HODGEFORM_ALLOW_SIGNUPS: "false",
    BETTER_AUTH_URL: "https://integration.hodgeform.test",
    BETTER_AUTH_SECRET: "integration-auth-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
    HODGEFORM_DEPLOYMENT_MODE: "saas",
    HODGEFORM_RECEIPT_PRIVATE_KEY_B64: Buffer.from(privPem).toString("base64"),
    HODGEFORM_RECEIPT_PUBLIC_KEY_B64: Buffer.from(pubPem).toString("base64"),
    HODGEFORM_SIGNER_ID: "integration-release-authority",
    HODGEFORM_SANDBOX_SOCKET: "",
    HODGEFORM_SANDBOX_URL: "",
    HODGEFORM_LEGAL_ENTITY_NAME: "HodgeForm Integration Test",
    HODGEFORM_LEGAL_EFFECTIVE_DATE: "2026-09-03",
    HODGEFORM_SUPPORT_EMAIL: "support@example.test",
    HODGEFORM_SECURITY_EMAIL: "security@example.test",
    HODGEFORM_PRIVACY_EMAIL: "privacy@example.test",
    HODGEFORM_ADMIN_EMAILS: "admin@example.test",
    HODGEFORM_DATA_RETENTION_DAYS: "30",
    HODGEFORM_LEGAL_REVIEWED: "true",
  };
  child = spawn(process.execPath, [".output/server/index.mjs"], { env, stdio: ["ignore","pipe","pipe"] });
  child.stdout.on("data", (d) => process.stdout.write(`[app] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[app] ${d}`));
  await waitReady();

  const repoA = await request(tokenA, "/api/v1/repositories", { method: "POST", body: JSON.stringify({ name: "Tenant A Repo" }) });
  const repoB = await request(tokenB, "/api/v1/repositories", { method: "POST", body: JSON.stringify({ name: "Tenant B Repo" }) });
  assert.equal(repoA.status, 201); assert.equal(repoB.status, 201);
  assert.equal((await request(tokenA,"/api/v1/repositories")).body.repositories.length, 1);
  assert.equal((await request(tokenB,"/api/v1/repositories")).body.repositories.length, 1);
  assert.notEqual(repoA.body.id, repoB.body.id);
  assert.equal((await request(tokenRead,"/api/v1/repositories")).status,200,"read-only token may read repositories");
  assert.equal((await request(tokenRead,"/api/v1/repositories",{method:"POST",body:JSON.stringify({name:"must-not-create"})})).status,403,"read-only token must not mutate repositories");

  const candidateA = await request(tokenA, "/api/v1/candidates", { method: "POST", body: JSON.stringify({ repositoryId: repoA.body.id, version: "v1", artifactHash: "a".repeat(64), manifest: { name: "Agent A", capabilities: [] }, intent: { pack: "basic", dataClass: "internal" } }) });
  assert.equal(candidateA.status, 201);
  const frozenA = await request(tokenA, `/api/v1/candidates/${candidateA.body.candidateId}`);
  const detailsA = frozenA.body;
  assert.equal(detailsA.gateReady, false, "artifact freeze alone cannot satisfy other obligations");
  assert.equal(detailsA.verdicts.find(v => v.requirement.id === "HF-REG-001").status, "missing");
  assert.equal(detailsA.verdicts.find(v => v.requirement.id === "HF-CAP-001").status, "missing");


  const highRisk = await request(tokenA, "/api/v1/candidates", { method: "POST", body: JSON.stringify({ repositoryId: repoA.body.id, version: "high-risk-v1", artifactHash: "d".repeat(64), manifest: { name: "Payment Agent", capabilities: ["payment.execute"] }, intent: { pack: "high-risk", dataClass: "confidential" } }) });
  assert.equal(highRisk.status,201);
  const unboundIndependent = await request(tokenA, `/api/v1/candidates/${highRisk.body.candidateId}/evidence`, { method:"POST", body:JSON.stringify({requirementId:"HF-IND-001",evidenceKind:"independent_verifier",outcome:"pass",source:"self-asserted",payload:{result:"pass"}}) });
  assert.equal(unboundIndependent.status,400,"ordinary CI token cannot self-assert independent verifier status");
  const boundIndependent = await request(tokenVerifier, `/api/v1/candidates/${highRisk.body.candidateId}/evidence`, { method:"POST", body:JSON.stringify({requirementId:"HF-IND-001",evidenceKind:"independent_verifier",outcome:"pass",source:"spoofed-source",payload:{result:"pass"}}) });
  assert.equal(boundIndependent.status,201);
  assert.equal(boundIndependent.body.independence,"independent");
  assert.equal(boundIndependent.body.source,"verifier:Independent integration verifier");
  assert.equal(boundIndependent.body.binding.artifactHash,"d".repeat(64));
  assert.equal(boundIndependent.body.binding.verifierPrincipalId,verifierId);
  const workerId=`worker_it_${suffix}`,jobId=`job_it_${suffix}`;
  const wk=generateKeyPairSync("ed25519"),workerPem=wk.publicKey.export({type:"spki",format:"pem"});
  const image=`sha256:${"c".repeat(64)}`;
  await q(`insert into verifier_workers(id,tenant_id,verifier_principal_id,image,evidence_kind,public_key_pem,allowed_requirements_json,created_by) values($1,$2,$3,$4,'deterministic_test',$5,'["HF-REG-001"]',$6)`,[workerId,tenantA,verifierId,image,workerPem,ids.a]);
  const now=Date.now();
  const job={schema:"hodgeform-verifier-job/1",id:jobId,tenantId:tenantA,candidateId:candidateA.body.candidateId,artifactHash:"a".repeat(64),policyHash:candidateA.body.policyHash,requirementId:"HF-REG-001",experimentHash:null,workerId,image,evidenceKind:"deterministic_test",createdAt:new Date(now).toISOString(),expiresAt:new Date(now+60_000).toISOString(),nonce:suffix,limits:{seconds:120,memoryMb:256,pids:64}};
  await q(`insert into verifier_jobs(id,tenant_id,worker_id,candidate_id,job_json,job_hash,expires_at,created_by) values($1,$2,$3,$4,$5::jsonb,$6,$7,$8)`,[jobId,tenantA,workerId,job.candidateId,JSON.stringify(job),objectHash(job),job.expiresAt,ids.a]);
  const payload={schema:"hodgeform-worker-result/1",jobId,jobHash:objectHash(job),outcome:"pass",measurements:{failed_tests:0},details:"Signed integration fixture, not a real container execution",outputHash:"e".repeat(64),startedAt:job.createdAt,finishedAt:new Date().toISOString()};
  const attestation={payload,signature:sign(null,Buffer.from(canonicalize(payload)),wk.privateKey).toString("base64")};
  assert.equal((await request(tokenB,"/api/v1/verifier-jobs",{method:"POST",body:JSON.stringify(attestation)})).status,400);
  assert.equal((await request(tokenVerifier,"/api/v1/verifier-jobs",{method:"POST",body:JSON.stringify({...attestation,payload:{...payload,outcome:"fail"}})})).status,400);
  const concurrentResults=await Promise.all([1,2].map(()=>request(tokenVerifier,"/api/v1/verifier-jobs",{method:"POST",body:JSON.stringify(attestation)})));
  assert.deepEqual(concurrentResults.map(r=>r.status).sort(),[201,400],"signed job may be consumed exactly once under concurrent replay");
  const authenticatedEvidence=await q(`select attestation_verified from evidence_receipts where tenant_id=$1 and candidate_id=$2 and requirement_id='HF-REG-001'`,[tenantA,job.candidateId]);
  assert.equal(authenticatedEvidence.rows.length,1);assert.equal(authenticatedEvidence.rows[0].attestation_verified,true);

  const crossRead = await request(tokenB, `/api/v1/candidates/${candidateA.body.candidateId}`);
  assert.equal(crossRead.status, 404, "cross-tenant candidate read must be hidden");
  const crossCreate = await request(tokenB, "/api/v1/candidates", { method: "POST", body: JSON.stringify({ repositoryId: repoA.body.id, version: "evil", artifactHash: "b".repeat(64), manifest: { name: "Cross Tenant", capabilities: [] }, intent: { pack: "basic", dataClass: "internal" } }) });
  assert.equal(crossCreate.status, 400, "cross-tenant repository use must be rejected");

  const concurrentBody = JSON.stringify({ repositoryId: repoA.body.id, version: "concurrent-v1", artifactHash: "c".repeat(64), manifest: { name: "Concurrent", capabilities: [] }, intent: { pack: "basic", dataClass: "internal" } });
  const concurrent = await Promise.all([
    request(tokenA, "/api/v1/candidates", { method: "POST", body: concurrentBody }),
    request(tokenA, "/api/v1/candidates", { method: "POST", body: concurrentBody }),
  ]);
  assert.deepEqual(concurrent.map(x=>x.status).sort(), [201,400], "duplicate concurrent release versions must not both commit");

  assert.equal((await request(tokenC,"/api/v1/repositories")).status, 200, "current workspace member token should work");
  await q(`delete from workspace_members where workspace_id=$1 and user_id=$2`, [ids.wa,ids.c]);
  assert.equal((await request(tokenC,"/api/v1/repositories")).status, 401, "membership removal must invalidate old workspace token");

  await q(`update api_tokens set revoked_at=now() where token_hash=$1`, [sha256(tokenA)]);
  assert.equal((await request(tokenA,"/api/v1/repositories")).status, 401, "revoked API token must fail immediately");

  const health = await fetch(`${base}/api/health`); const ready = await fetch(`${base}/api/ready`);
  assert.equal(health.status,200); assert.equal(ready.status,200);
  assert.ok(health.headers.get("x-request-id")); assert.ok(ready.headers.get("x-request-id"));
  console.log("postgres/http integration: PASS");
} finally {
  if (child) { child.kill("SIGTERM"); await Promise.race([new Promise(r=>child.once("exit",r)), sleep(2000)]); if (!child.killed) child.kill("SIGKILL"); }
  await cleanup();
}
