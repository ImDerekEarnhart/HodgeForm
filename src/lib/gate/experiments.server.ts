import { randomUUID } from "node:crypto";
import { getSql, withTransaction, type Sql } from "@/lib/db";
import { tenantForUser } from "./tenant.server";
import { assertPublicReleaseReady } from "./config.server";
import { enforceAgentRateLimit } from "@/lib/security/rate-limit.server";
import { sha256 } from "./crypto.server";
import { experimentProtocolSchema, evaluateExperiment, type ExperimentProtocol, type ExperimentEvidence } from "./experiment";
import type { CompiledPolicy, Independence } from "./types";

type Frozen = { schema: string; discoveryId: string; discoveryHash: string; candidateId: string; artifactHash: string; policyHash: string; protocol: ExperimentProtocol; minimumIndependence: Record<string, Independence> };
type ExperimentRow = { id: string; discovery_id: string; candidate_id: string; experiment_hash: string; frozen_json: Frozen; created_at: string };

export async function evaluateFrozenExperiment(sql:Sql,tenant:string,experiment:ExperimentRow) {
  if(sha256(experiment.frozen_json)!==experiment.experiment_hash)throw new Error("Frozen experiment integrity failed");
  const rows=await sql.query<{ id:string; requirement_id:string; outcome:string; independence:Independence; attestation_verified:boolean; payload_json:Record<string, unknown> }>(
    `select e.id,e.requirement_id,e.outcome,e.independence,e.attestation_verified,e.payload_json from evidence_receipts e
     where e.tenant_id=$1 and e.candidate_id=$2 and e.created_at >= $3 and e.payload_json->>'experimentHash'=$4 order by e.created_at,e.id`,[tenant,experiment.candidate_id,experiment.created_at,experiment.experiment_hash]);
  const evidence: ExperimentEvidence[]=rows.map(e=>({id:e.id,requirementId:e.requirement_id,outcome:e.outcome,independence:e.independence,authenticated:e.attestation_verified,
    experimentHash:typeof e.payload_json.experimentHash==='string'?e.payload_json.experimentHash:null,
    measurements:e.payload_json.measurements && typeof e.payload_json.measurements==='object'&&!Array.isArray(e.payload_json.measurements)?e.payload_json.measurements as Record<string,unknown>:{} }));
  return {...evaluateExperiment(experiment.frozen_json.protocol,experiment.experiment_hash,evidence,experiment.frozen_json.minimumIndependence),experimentHash:experiment.experiment_hash,evidenceIds:evidence.map(e=>e.id)};
}

export async function candidateExperimentReadiness(sql:Sql,tenant:string,candidateId:string) {
  const rows=await sql.query<ExperimentRow>("select * from discovery_experiments where tenant_id=$1 and candidate_id=$2 order by created_at,id",[tenant,candidateId]);
  return Promise.all(rows.map(async e=>({id:e.id,...await evaluateFrozenExperiment(sql,tenant,e)})));
}

export async function freezeExperiment(userId: string, input: { discoveryId: string; candidateId: string; expectedDiscoveryHash: string; expectedPolicyHash: string; protocol: ExperimentProtocol }) {
  enforceAgentRateLimit(userId); assertPublicReleaseReady();
  const protocol = experimentProtocolSchema.parse(input.protocol);
  const tenant = await tenantForUser(userId);
  return withTransaction(async sql => {
    const [d] = await sql.query<{ content_hash: string; repository_id: string }>("select content_hash,repository_id from discovery_commits where tenant_id=$1 and id=$2 for update", [tenant,input.discoveryId]);
    const [c] = await sql.query<{ artifact_hash: string; policy_hash: string; compiled_policy_json: CompiledPolicy }>(
      `select c.artifact_hash,p.policy_hash,p.compiled_policy_json from release_candidates c join gate_plans p on p.candidate_id=c.id and p.tenant_id=c.tenant_id
       where c.tenant_id=$1 and c.id=$2 and c.repository_id=$3 and c.status='frozen' for update of c`, [tenant,input.candidateId,d?.repository_id ?? ""]);
    if (!d || !c || d.content_hash !== input.expectedDiscoveryHash || c.policy_hash !== input.expectedPolicyHash) throw new Error("Exact proposal and frozen candidate in this repository are required");
    const minimumIndependence: Record<string, Independence> = {};
    for (const criterion of protocol.criteria) {
      const requirement = c.compiled_policy_json.requirements.find(r => r.id === criterion.requirementId);
      if (!requirement) throw new Error("Experiment criterion references an obligation outside the frozen gate");
      minimumIndependence[requirement.id] = requirement.minimumIndependence;
    }
    const frozen: Frozen = { schema:"hodgeform-frozen-experiment/1", discoveryId:input.discoveryId, discoveryHash:d.content_hash, candidateId:input.candidateId, artifactHash:c.artifact_hash, policyHash:c.policy_hash, protocol, minimumIndependence };
    const experimentHash=sha256(frozen), id=`experiment_${randomUUID()}`;
    await sql.query("insert into discovery_experiments(id,tenant_id,discovery_id,candidate_id,frozen_json,experiment_hash,created_by) values($1,$2,$3,$4,$5::jsonb,$6,$7)", [id,tenant,input.discoveryId,input.candidateId,JSON.stringify(frozen),experimentHash,userId]);
    return { id, experimentHash, frozen };
  });
}

export async function listExperiments(userId: string) {
  const tenant=await tenantForUser(userId), sql=await getSql();
  const experiments=await sql.query<ExperimentRow>("select id,discovery_id,candidate_id,experiment_hash,frozen_json,created_at from discovery_experiments where tenant_id=$1 order by created_at desc limit 200",[tenant]);
  const evaluations=await sql.query<{ id:string; experiment_id:string; result_json:ReturnType<typeof evaluateExperiment>; result_hash:string; created_at:string }>(
    "select id,experiment_id,result_json,result_hash,created_at from discovery_evaluations where tenant_id=$1 order by created_at desc limit 1000", [tenant]);
  return experiments.map(e=>({...e,evaluations:evaluations.filter(v=>v.experiment_id===e.id)}));
}

export async function recordExperimentEvaluation(userId: string, experimentId: string, expectedHash: string) {
  enforceAgentRateLimit(userId); assertPublicReleaseReady();
  const tenant=await tenantForUser(userId);
  return withTransaction(async sql=>{
    const [experiment]=await sql.query<ExperimentRow>("select * from discovery_experiments where tenant_id=$1 and id=$2 for update",[tenant,experimentId]);
    if(!experiment || experiment.experiment_hash!==expectedHash || sha256(experiment.frozen_json)!==expectedHash) throw new Error("Frozen experiment hash mismatch");
    const result=await evaluateFrozenExperiment(sql,tenant,experiment);
    const resultHash=sha256(result);
    await sql.query("insert into discovery_evaluations(id,tenant_id,experiment_id,result_json,result_hash,created_by) values($1,$2,$3,$4::jsonb,$5,$6) on conflict(experiment_id,result_hash) do nothing",[`evaluation_${randomUUID()}`,tenant,experimentId,JSON.stringify(result),resultHash,userId]);
    return {result,resultHash};
  });
}
