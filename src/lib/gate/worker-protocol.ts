import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import { canonicalize, sha256 } from "./crypto.server.ts";
import { CAPABILITIES, type JsonValue } from "./types.ts";

export const imageSchema=z.string().regex(/^(?:[a-zA-Z0-9][a-zA-Z0-9._/:-]*@)?sha256:[a-f0-9]{64}$/);
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const workerResultSchema=z.object({
  payload:z.object({schema:z.literal("hodgeform-worker-result/1"),jobId:z.string().max(100),jobHash:digest,
    outcome:z.enum(["pass","fail","inconclusive"]),measurements:z.record(z.string().max(80),z.number().finite()),
    details:z.string().max(6000),outputHash:digest,startedAt:z.iso.datetime(),finishedAt:z.iso.datetime(),
    inventory:z.object({complete:z.boolean(),detectedCapabilities:z.array(z.enum(CAPABILITIES)).max(30)}).strict().optional(),
  }).strict(), signature:z.string().regex(/^[A-Za-z0-9+/]{86}==$/),
}).strict();
export type WorkerResult=z.infer<typeof workerResultSchema>;
export type VerifierJob={schema:"hodgeform-verifier-job/1";id:string;tenantId:string;candidateId:string;artifactHash:string;policyHash:string;requirementId:string;experimentHash:string|null;workerId:string;image:string;evidenceKind:"deterministic_test"|"sandbox_run"|"static_analysis"|"independent_verifier";createdAt:string;expiresAt:string;nonce:string;limits:{seconds:number;memoryMb:number;pids:number};experiment?:JsonValue};

export function verifyWorkerResult(input:unknown,job:VerifierJob,publicKeyPem:string,now=Date.now()) {
  const result=workerResultSchema.parse(input),p=result.payload;
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=="ed25519")throw new Error("Worker must use an Ed25519 key");
  if(p.jobId!==job.id||p.jobHash!==sha256(job))throw new Error("Worker result does not match the frozen job");
  const start=Date.parse(p.startedAt),end=Date.parse(p.finishedAt),created=Date.parse(job.createdAt),expires=Date.parse(job.expiresAt);
  if(![now,start,end,created,expires].every(Number.isFinite)||now>=expires||start<created||end<start||end>now+30_000||end>=expires||end-start>(job.limits.seconds+30)*1000)throw new Error("Worker result is expired or outside its execution window");
  if(!verify(null,Buffer.from(canonicalize(p)),key,Buffer.from(result.signature,"base64")))throw new Error("Worker signature is invalid");
  return result;
}
