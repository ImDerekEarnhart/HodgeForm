import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runVerifierJob } from "../bin/verifier-runner.mjs";
import { sha256 } from "../src/lib/gate/crypto.server.ts";
import { verifyWorkerResult } from "../src/lib/gate/worker-protocol.ts";

const build=spawnSync("docker",["build","-q","tests/fixtures/verifier"],{encoding:"utf8",timeout:120_000});
assert.equal(build.status,0,build.stderr);
const image=build.stdout.trim().split("\n").at(-1);
assert.match(image,/^sha256:[a-f0-9]{64}$/);
const kp=generateKeyPairSync("ed25519"),dir=await mkdtemp(join(tmpdir(),"hf-worker-smoke-"));
const privateKeyPem=kp.privateKey.export({type:"pkcs8",format:"pem"});
const publicKeyPem=kp.publicKey.export({type:"spki",format:"pem"});
try{
  for(const [mode,expected] of [["containment","pass"],["malformed","inconclusive"],["timeout","inconclusive"]]) {
    const artifactPath=join(dir,mode);await writeFile(artifactPath,mode);
    const now=Date.now(),job={schema:"hodgeform-verifier-job/1",id:randomUUID(),tenantId:"test",candidateId:"test",artifactHash:sha256(mode),policyHash:"b".repeat(64),requirementId:"HF-REG-001",experimentHash:null,workerId:"test",image,evidenceKind:"deterministic_test",createdAt:new Date(now).toISOString(),expiresAt:new Date(now+60_000).toISOString(),nonce:randomUUID(),limits:{seconds:mode==="timeout"?1:10,memoryMb:256,pids:64}};
    const result=await runVerifierJob({job,artifactPath,image,privateKeyPem});
    assert.equal(result.payload.outcome,expected,JSON.stringify(result.payload));
    assert.equal(verifyWorkerResult(result,job,publicKeyPem).payload.outcome,expected);
  }
  const containers=spawnSync("docker",["ps","-aq","--filter","name=hf-"],{encoding:"utf8"});
  assert.equal(containers.stdout.trim(),"","Disposable verifier containers must be removed");
  console.log("Disposable worker containment, signed PASS, malformed output and timeout checks: PASS");
}finally{await rm(dir,{recursive:true,force:true});}
