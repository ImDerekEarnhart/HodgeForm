import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync,sign } from "node:crypto";
import { sha256,canonicalize } from "../src/lib/gate/crypto.server.ts";
import { admitPod,verifyDeploymentReceipt } from "../src/lib/gate/deployment-admission.ts";
const kp=generateKeyPairSync("ed25519"),pub=kp.publicKey.export({type:"spki",format:"pem"}),now=Date.now();
const target={namespace:"production",tenant:"workspace:owner",repositoryId:"repo-approved",policyHash:"b".repeat(64),maxReceiptAgeSeconds:3600};
const artifact="a".repeat(64);
const payload={schema:"hodgeform-release-receipt/1",evaluator:"hodgeform-obligation-evaluator/2",verdict:"RELEASE",tenant:target.tenant,candidate:{id:"c",artifactHash:artifact,repositoryId:target.repositoryId},policy:{hash:target.policyHash},requirements:[{id:"HF-REG-001",status:"pass"}],approval:{approvedBy:"human",decidedAt:new Date(now-1000).toISOString()}};
const seal=p=>({schema:"hodgeform-signed-release/1",payload:p,receiptHash:sha256(p),signature:sign(null,Buffer.from(canonicalize(p)),kp.privateKey).toString("base64"),publicKeyFingerprint:sha256(kp.publicKey.export({type:"spki",format:"der"}))});
test("deployment requires exact target, artifact, current evaluator and fresh RELEASE",()=>{
  assert.equal(verifyDeploymentReceipt(seal(payload),pub,target,artifact,now).allowed,true);
  for(const change of [{verdict:"BLOCK"},{evaluator:"legacy"},{tenant:"different"},{policy:{hash:"c".repeat(64)}},{candidate:{...payload.candidate,repositoryId:"other"}},{requirements:[]},{requirements:[{id:"x",status:"missing"}]}])assert.throws(()=>verifyDeploymentReceipt(seal({...payload,...change}),pub,target,artifact,now));
  assert.throws(()=>verifyDeploymentReceipt(seal(payload),pub,target,"d".repeat(64),now));
  assert.throws(()=>verifyDeploymentReceipt(seal(payload),pub,target,artifact,now+3_600_000));
  assert.throws(()=>verifyDeploymentReceipt(seal(payload),pub,target,artifact,now-5000));
});
test("pod admission checks init and ephemeral containers as well as the primary image",()=>{
  const pod={request:{uid:"u",operation:"CREATE",namespace:target.namespace,kind:{group:"",version:"v1",kind:"Pod"},object:{metadata:{annotations:{"hodgeform.com/receipts":JSON.stringify({[artifact]:seal(payload)})}},spec:{containers:[{image:`registry/app@sha256:${artifact}`}]}}}};
  assert.equal(admitPod(pod,pub,target,now).allowed,true);
  for(const field of ["initContainers","ephemeralContainers"]){const attack=structuredClone(pod);attack.request.object.spec[field]=[{image:"unapproved:latest"}];assert.throws(()=>admitPod(attack,pub,target,now));}
  const tampered=structuredClone(pod);tampered.request.object.metadata.annotations={};assert.throws(()=>admitPod(tampered,pub,target,now));
});
