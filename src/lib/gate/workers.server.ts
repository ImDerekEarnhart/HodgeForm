import { createPublicKey, randomUUID } from "node:crypto";
import { getSql, withTransaction } from "@/lib/db";
import { tenantForUser, userCanAccessTenant } from "./tenant.server";
import { requireVerifierAdmin, resolveVerifierPrincipal } from "./verifiers.server";
import { assertPublicReleaseReady } from "./config.server";
import { enforceAgentRateLimit } from "@/lib/security/rate-limit.server";
import { sha256 } from "./crypto.server";
import { persistEvidence } from "./service.server";
import { imageSchema, verifyWorkerResult, type VerifierJob } from "./worker-protocol";
import type { CompiledPolicy, EvidenceAuthContext, JsonValue } from "./types";

type WorkerRow={id:string;tenant_id:string;verifier_principal_id:string;image:string;evidence_kind:VerifierJob["evidenceKind"];public_key_pem:string;allowed_requirements_json:string[];disabled_at:string|null};

export async function registerWorker(userId:string,input:{verifierId:string;image:string;publicKeyPem:string;requirementIds:string[];evidenceKind:VerifierJob["evidenceKind"]}) {
  enforceAgentRateLimit(userId);assertPublicReleaseReady();
  const tenant=await tenantForUser(userId),sql=await getSql(); await requireVerifierAdmin(sql,userId,tenant);
  imageSchema.parse(input.image);
  const key=createPublicKey(input.publicKeyPem);
  if(key.asymmetricKeyType!=="ed25519")throw new Error("Use an Ed25519 worker public key");
  await resolveVerifierPrincipal(sql,tenant,input.verifierId,input.evidenceKind);
  const id=`worker_${randomUUID()}`;
  await sql.query("insert into verifier_workers(id,tenant_id,verifier_principal_id,image,evidence_kind,public_key_pem,allowed_requirements_json,created_by) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8)",[id,tenant,input.verifierId,input.image,input.evidenceKind,key.export({type:"spki",format:"pem"}),JSON.stringify([...new Set(input.requirementIds)]),userId]);
  return {id};
}

export async function listWorkers(userId:string) {
  const tenant=await tenantForUser(userId),sql=await getSql();
  return sql.query<WorkerRow>("select * from verifier_workers where tenant_id=$1 order by created_at desc",[tenant]);
}

export async function queueVerifierJob(userId:string,input:{workerId:string;candidateId:string;requirementId:string;expectedPolicyHash:string;experimentId?:string}) {
  enforceAgentRateLimit(userId);assertPublicReleaseReady(); const tenant=await tenantForUser(userId);
  return withTransaction(async sql=>{
    await requireVerifierAdmin(sql,userId,tenant);
    const [worker]=await sql.query<WorkerRow>("select * from verifier_workers where tenant_id=$1 and id=$2 and disabled_at is null for update",[tenant,input.workerId]);
    if(!worker||!worker.allowed_requirements_json.includes(input.requirementId))throw new Error("Worker is not approved for this obligation");
    await resolveVerifierPrincipal(sql,tenant,worker.verifier_principal_id,worker.evidence_kind);
    const [c]=await sql.query<{artifact_hash:string;policy_hash:string;compiled_policy_json:CompiledPolicy}>(
      "select c.artifact_hash,p.policy_hash,p.compiled_policy_json from release_candidates c join gate_plans p on p.candidate_id=c.id and p.tenant_id=c.tenant_id where c.tenant_id=$1 and c.id=$2 and c.status='frozen'",[tenant,input.candidateId]);
    const requirement=c?.compiled_policy_json.requirements.find(r=>r.id===input.requirementId);
    if(!c||c.policy_hash!==input.expectedPolicyHash||!requirement?.allowedEvidence.includes(worker.evidence_kind))throw new Error("Exact frozen candidate and admissible obligation required");
    const [count]=await sql.query<{count:string}>("select count(*) as count from verifier_jobs where tenant_id=$1 and worker_id=$2 and completed_at is null and expires_at>now()",[tenant,worker.id]);
    if(Number(count?.count)>=10)throw new Error("Worker already has 10 pending jobs");
    const [experiment]=input.experimentId?await sql.query<{experiment_hash:string;frozen_json:JsonValue}>("select experiment_hash,frozen_json from discovery_experiments where tenant_id=$1 and id=$2 and candidate_id=$3",[tenant,input.experimentId,input.candidateId]):[];
    if(input.experimentId&&!experiment)throw new Error("Experiment must be frozen against this candidate");
    const now=Date.now();
    const job:VerifierJob={schema:"hodgeform-verifier-job/1",id:`job_${randomUUID()}`,tenantId:tenant,candidateId:input.candidateId,artifactHash:c.artifact_hash,policyHash:c.policy_hash,requirementId:requirement.id,experimentHash:experiment?.experiment_hash??null,workerId:worker.id,image:worker.image,evidenceKind:worker.evidence_kind,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+15*60_000).toISOString(),nonce:randomUUID(),limits:{seconds:120,memoryMb:256,pids:64},...(experiment?{experiment:experiment.frozen_json}:{})};
    const jobHash=sha256(job);
    await sql.query("insert into verifier_jobs(id,tenant_id,worker_id,candidate_id,job_json,job_hash,expires_at,created_by) values($1,$2,$3,$4,$5::jsonb,$6,$7,$8)",[job.id,tenant,worker.id,input.candidateId,JSON.stringify(job),jobHash,job.expiresAt,userId]);
    return {job,jobHash};
  });
}

export async function pendingVerifierJobs(userId:string,tenant:string,auth:EvidenceAuthContext) {
  if(!auth.verifierPrincipalId||!await userCanAccessTenant(userId,tenant))throw new Error("Verifier identity required");
  const sql=await getSql();
  return sql.query<{job_json:VerifierJob;job_hash:string}>(`select j.job_json,j.job_hash from verifier_jobs j join verifier_workers w on w.id=j.worker_id and w.tenant_id=j.tenant_id
    where j.tenant_id=$1 and w.verifier_principal_id=$2 and w.disabled_at is null and j.completed_at is null and j.expires_at>now() order by j.created_at limit 10`,[tenant,auth.verifierPrincipalId]);
}

export async function acceptVerifierResult(userId:string,tenant:string,auth:EvidenceAuthContext,input:unknown) {
  enforceAgentRateLimit(userId);assertPublicReleaseReady();
  if(!auth.verifierPrincipalId||!await userCanAccessTenant(userId,tenant))throw new Error("Verifier identity required");
  const jobId=(input as {payload?:{jobId?:unknown}})?.payload?.jobId;
  if(typeof jobId!=="string"||jobId.length>100)throw new Error("Job ID required");
  return withTransaction(async sql=>{
    const [row]=await sql.query<{job_json:VerifierJob;job_hash:string;completed_at:string|null}>("select job_json,job_hash,completed_at from verifier_jobs where tenant_id=$1 and id=$2 for update",[tenant,jobId]);
    if(!row||row.completed_at)throw new Error("Job is unavailable or already consumed");
    const job=row.job_json;
    const [worker]=await sql.query<WorkerRow>("select * from verifier_workers where tenant_id=$1 and id=$2 and verifier_principal_id=$3 and disabled_at is null",[tenant,job.workerId,auth.verifierPrincipalId]);
    if(!worker||sha256(job)!==row.job_hash||worker.image!==job.image||worker.evidence_kind!==job.evidenceKind||!worker.allowed_requirements_json.includes(job.requirementId))throw new Error("Worker/job binding mismatch");
    const result=verifyWorkerResult(input,job,worker.public_key_pem);
    const p=result.payload;
    const evidence=await persistEvidence(sql,userId,tenant,job.candidateId,{requirementId:job.requirementId,evidenceKind:job.evidenceKind,outcome:p.outcome,source:`worker:${worker.id}`,payload:{
      experimentHash:job.experimentHash,artifactHash:job.artifactHash,measurements:p.measurements,details:p.details,jobId:job.id,jobHash:row.job_hash,
      outputHash:p.outputHash,workerSignature:result.signature,...(p.inventory??{}),
    }},auth,true);
    await sql.query("update verifier_jobs set completed_at=clock_timestamp(),evidence_id=$3,result_json=$4::jsonb where tenant_id=$1 and id=$2",[tenant,job.id,evidence.evidenceId,JSON.stringify(result)]);
    return evidence;
  });
}
