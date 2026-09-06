import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyWorkerResult } from "../src/lib/gate/worker-protocol.ts";
import { sha256, canonicalize } from "../src/lib/gate/crypto.server.ts";
import { containerArguments } from "../bin/verifier-runner.mjs";
const kp=generateKeyPairSync("ed25519"),pub=kp.publicKey.export({type:"spki",format:"pem"});
const now=Date.now();
const job={schema:"hodgeform-verifier-job/1",id:"job-1",tenantId:"tenant-a",candidateId:"candidate-a",artifactHash:"a".repeat(64),policyHash:"b".repeat(64),requirementId:"HF-REG-001",experimentHash:null,workerId:"w",image:`sha256:${"c".repeat(64)}`,evidenceKind:"deterministic_test",createdAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60_000).toISOString(),nonce:"unique",limits:{seconds:120,memoryMb:256,pids:64}};
const payload={schema:"hodgeform-worker-result/1",jobId:job.id,jobHash:sha256(job),outcome:"pass",measurements:{failed_tests:0},details:"test fixture",outputHash:"d".repeat(64),startedAt:job.createdAt,finishedAt:new Date(now).toISOString()};
const signed=p=>({payload:p,signature:sign(null,Buffer.from(canonicalize(p)),kp.privateKey).toString("base64")});
test("signed results bind artifact, policy, tenant, obligation, worker and nonce",()=>{
  assert.equal(verifyWorkerResult(signed(payload),job,pub,now).payload.outcome,"pass");
  for(const field of ["artifactHash","policyHash","tenantId","requirementId","workerId","nonce","experimentHash","image"])assert.throws(()=>verifyWorkerResult(signed(payload),{...job,[field]:"different"},pub,now),/frozen job/);
  assert.throws(()=>verifyWorkerResult({...signed(payload),payload:{...payload,outcome:"fail"}},job,pub,now),/signature/);
  const wrong=generateKeyPairSync("ed25519").publicKey.export({type:"spki",format:"pem"});
  assert.throws(()=>verifyWorkerResult(signed(payload),job,wrong,now),/signature/);
});
test("expired and future executions fail closed",()=>{
  assert.throws(()=>verifyWorkerResult(signed(payload),job,pub,now+60_000),/expired/);
  assert.throws(()=>verifyWorkerResult(signed({...payload,startedAt:new Date(now-5000).toISOString()}),job,pub,now),/window/);
  assert.throws(()=>verifyWorkerResult(signed({...payload,finishedAt:new Date(now+40_000).toISOString()}),job,pub,now),/window/);
});
test("container contract has no network, credentials, writable host mounts or standing privileges",()=>{
  const args=containerArguments("hf-aabb",job.image,"/safe/artifact","/safe/job.json",job.limits);
  for(const [name,value] of [["--network","none"],["--cap-drop","ALL"],["--user","65532:65532"],["--security-opt","no-new-privileges"]])assert.equal(args[args.indexOf(name)+1],value);
  assert.ok(args.includes("--read-only"));assert.ok(!args.includes("--privileged"));assert.ok(!args.includes("--env"));
  for(const x of args.filter(x=>x.startsWith("type=bind")))assert.ok(x.endsWith(",readonly"));
  assert.throws(()=>containerArguments("hf-aabb","image:latest","/a","/b",job.limits));
  assert.throws(()=>containerArguments("hf-aabb",job.image,"/a,other=escape","/b",job.limits));
});
