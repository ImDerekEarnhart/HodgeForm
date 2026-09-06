import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";
import { canonicalize, sha256 } from "./crypto.server.ts";

const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const deploymentTargetSchema=z.object({
  namespace:z.string().min(1).max(100),tenant:z.string().min(1).max(200),repositoryId:z.string().min(1).max(100),policyHash:digest,
  maxReceiptAgeSeconds:z.number().int().min(60).max(86400),
}).strict();
export type DeploymentTarget=z.infer<typeof deploymentTargetSchema>;
const receiptSchema=z.object({schema:z.literal("hodgeform-signed-release/1"),payload:z.object({
  schema:z.literal("hodgeform-release-receipt/1"),evaluator:z.literal("hodgeform-obligation-evaluator/2"),verdict:z.literal("RELEASE"),tenant:z.string(),
  candidate:z.object({id:z.string().min(1),artifactHash:digest,repositoryId:z.string().min(1)}).passthrough(),
  policy:z.object({hash:digest}).passthrough(),
  requirements:z.array(z.object({id:z.string().min(1),status:z.literal("pass")}).passthrough()).min(1),
  experiments:z.array(z.object({status:z.literal("survived")}).passthrough()).optional(),
  approval:z.object({approvedBy:z.string().min(1),decidedAt:z.iso.datetime()}).passthrough(),
}).passthrough(),receiptHash:digest,signature:z.string().regex(/^[A-Za-z0-9+/]{86}==$/),publicKeyFingerprint:digest}).passthrough();

/** Expected target and pinned key must come from the operator, never the submitted workload. */
export function verifyDeploymentReceipt(input:unknown,publicKeyPem:string,target:DeploymentTarget,artifactHash:string,now=Date.now()) {
  deploymentTargetSchema.parse(target);digest.parse(artifactHash);
  const doc=receiptSchema.parse(input),payload=doc.payload;
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=="ed25519")throw new Error("Ed25519 release key required");
  if(sha256(key.export({type:"spki",format:"der"}))!==doc.publicKeyFingerprint)throw new Error("Release signer is not pinned");
  if(sha256(payload)!==doc.receiptHash||!verify(null,Buffer.from(canonicalize(payload)),key,Buffer.from(doc.signature,"base64")))throw new Error("Release receipt integrity failed");
  if(payload.tenant!==target.tenant||payload.candidate.repositoryId!==target.repositoryId||payload.policy.hash!==target.policyHash||payload.candidate.artifactHash!==artifactHash)throw new Error("Receipt is not authorized for this exact deployment target and artifact");
  const age=now-Date.parse(payload.approval.decidedAt);
  if(!Number.isFinite(age)||age<0||age>target.maxReceiptAgeSeconds*1000)throw new Error("Release receipt is outside its admission window");
  if(new Set(payload.requirements.map(r=>r.id)).size!==payload.requirements.length)throw new Error("Duplicate obligation results");
  return {allowed:true,receiptHash:doc.receiptHash,artifactHash,namespace:target.namespace};
}

export function admitPod(review:unknown,publicKeyPem:string,target:DeploymentTarget,now=Date.now()) {
  const envelope=z.object({request:z.object({uid:z.string().min(1),operation:z.enum(["CREATE","UPDATE"]),namespace:z.string(),kind:z.object({group:z.literal(""),version:z.literal("v1"),kind:z.literal("Pod")}),object:z.object({metadata:z.object({annotations:z.record(z.string(),z.string()).optional()}),spec:z.object({containers:z.array(z.object({image:z.string()}).passthrough()).min(1),initContainers:z.array(z.object({image:z.string()}).passthrough()).optional(),ephemeralContainers:z.array(z.object({image:z.string()}).passthrough()).optional()}).passthrough()}).passthrough()}).passthrough()}).parse(review);
  if(envelope.request.namespace!==target.namespace)throw new Error("Unconfigured deployment namespace");
  const pod=envelope.request.object;
  const documents=JSON.parse(pod.metadata.annotations?.["hodgeform.com/receipts"]??"{}");
  const containers=[...pod.spec.containers,...(pod.spec.initContainers??[]),...(pod.spec.ephemeralContainers??[])];
  const receipts=containers.map(c=>{
    const match=/^[a-zA-Z0-9][a-zA-Z0-9._/:-]*@sha256:([a-f0-9]{64})$/.exec(c.image);
    if(!match)throw new Error("Every container must use an exact OCI manifest digest");
    return verifyDeploymentReceipt(documents[match[1]],publicKeyPem,target,match[1],now);
  });
  return {uid:envelope.request.uid,allowed:true,auditAnnotations:{"hodgeform.com/receipt-hashes":receipts.map(r=>r.receiptHash).join(",")}};
}
