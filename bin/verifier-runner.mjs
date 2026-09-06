#!/usr/bin/env node
// Operator-owned host process. Keys and API credentials never enter the job container.
import { readFile, writeFile, mkdtemp, rm, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID, createPrivateKey, sign } from "node:crypto";
import { fileURLToPath } from "node:url";
import { canonicalize, sha256 } from "../src/lib/gate/crypto.server.ts";
import { imageSchema, workerResultSchema } from "../src/lib/gate/worker-protocol.ts";

export function containerArguments(name,image,artifactPath,jobPath,limits) {
  imageSchema.parse(image);
  if(!/^hf-[a-f0-9-]+$/.test(name))throw new Error("Invalid job container name");
  if(!Number.isInteger(limits.seconds)||limits.seconds<1||limits.seconds>120||limits.memoryMb!==256||limits.pids!==64)throw new Error("Unsupported resource limits");
  if([artifactPath,jobPath].some(p=>p.includes(',')||p.includes('\n')))throw new Error("Unsafe bind path");
  return ["create","--name",name,"--network","none","--read-only","--cap-drop","ALL","--security-opt","no-new-privileges",
    "--pids-limit","64","--memory","256m","--memory-swap","256m","--cpus","1","--user","65532:65532",
    "--tmpfs","/tmp:rw,noexec,nosuid,size=32m","--log-driver","none",
    "--mount",`type=bind,src=${artifactPath},dst=/input/artifact,readonly`,
    "--mount",`type=bind,src=${jobPath},dst=/input/job.json,readonly`,"--entrypoint","/verifier/run",image];
}

export async function runVerifierJob({job,artifactPath,image,privateKeyPem,engine="docker"}) {
  imageSchema.parse(image);
  if(job.schema!=="hodgeform-verifier-job/1"||job.image!==image||Date.parse(job.expiresAt)<=Date.now()||!Number.isFinite(Date.parse(job.expiresAt)))throw new Error("Job image or expiration mismatch");
  const key=createPrivateKey(privateKeyPem);
  if(key.asymmetricKeyType!=="ed25519")throw new Error("Ed25519 worker key required");
  const metadata=await stat(artifactPath);
  if(!metadata.isFile()||metadata.size>64*1024*1024)throw new Error("Artifact must be a regular file of at most 64 MiB");
  const artifact=await readFile(artifactPath);
  if(artifact.length>64*1024*1024||sha256(artifact)!==job.artifactHash)throw new Error("Artifact does not match exact frozen bytes or exceeds 64 MiB");
  const temp=await mkdtemp(join(tmpdir(),"hf-verifier-"));
  const stagedArtifact=join(temp,"artifact"),jobPath=join(temp,"job.json"),name=`hf-${randomUUID()}`;
  const startedAt=new Date().toISOString();
  let output="",interrupted=false,exitCode=null;
  try {
    await writeFile(stagedArtifact,artifact,{mode:0o444});
    await writeFile(jobPath,JSON.stringify(job),{mode:0o444});
    const args=containerArguments(name,image,stagedArtifact,jobPath,job.limits);
    const created=spawnSync(engine,args,{encoding:"utf8",timeout:30_000,maxBuffer:64*1024,windowsHide:true});
    if(created.status!==0)throw new Error("Unable to create constrained verifier container; verify the local engine and pinned image");
    exitCode=await new Promise((accept,reject)=>{
      const child=spawn(engine,["start","--attach",name],{stdio:["ignore","pipe","pipe"],windowsHide:true});
      const stop=()=>{if(interrupted)return;interrupted=true;spawnSync(engine,["kill",name],{timeout:10_000,stdio:"ignore",windowsHide:true});child.kill();};
      const timer=setTimeout(stop,job.limits.seconds*1000);
      let bytes=0;
      child.stdout.on("data",chunk=>{bytes+=chunk.length;if(bytes>128*1024)stop();else output+=chunk.toString("utf8");});
      child.stderr.on("data",chunk=>{bytes+=chunk.length;if(bytes>128*1024)stop();});
      child.on("error",e=>{clearTimeout(timer);reject(e);});
      child.on("close",code=>{clearTimeout(timer);accept(code);});
    });
    let observed={outcome:"inconclusive",measurements:{},details:"Verifier did not return a valid completed result"};
    if(exitCode===0&&!interrupted) {
      try {
        const raw=JSON.parse(output);
        const trial=workerResultSchema.shape.payload.parse({schema:"hodgeform-worker-result/1",jobId:job.id,jobHash:sha256(job),outcome:raw.outcome,measurements:raw.measurements,details:raw.details,outputHash:sha256(output),startedAt,finishedAt:new Date().toISOString(),...(raw.inventory?{inventory:raw.inventory}:{})});
        observed={outcome:trial.outcome,measurements:trial.measurements,details:trial.details,...(trial.inventory?{inventory:trial.inventory}:{})};
      }catch{/* Malformed verifier output is never coerced to PASS. */}
    }
    const payload={schema:"hodgeform-worker-result/1",jobId:job.id,jobHash:sha256(job),...observed,outputHash:sha256(output),startedAt,finishedAt:new Date().toISOString()};
    return workerResultSchema.parse({payload,signature:sign(null,Buffer.from(canonicalize(payload)),key).toString("base64")});
  }finally{
    spawnSync(engine,["rm","--force",name],{timeout:15_000,stdio:"ignore",windowsHide:true});
    await rm(temp,{recursive:true,force:true});
  }
}

async function main() {
  const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};
  for(const name of ["--job","--artifact","--image","--key","--out"])if(!arg(name))throw new Error(`Required: ${name}`);
  const job=JSON.parse(await readFile(resolve(arg("--job")),"utf8"));
  const result=await runVerifierJob({job:job.job??job,artifactPath:resolve(arg("--artifact")),image:arg("--image"),privateKeyPem:await readFile(resolve(arg("--key")),"utf8")});
  await writeFile(resolve(arg("--out")),JSON.stringify(result,null,2)+"\n",{mode:0o600});
  if(process.argv.includes("--submit")) {
    const url=new URL(process.env.HODGEFORM_URL);
    if(url.protocol!=="https:"||url.username||url.password)throw new Error("HTTPS HODGEFORM_URL required");
    if(!process.env.HODGEFORM_TOKEN)throw new Error("Verifier-bound HODGEFORM_TOKEN required");
    const response=await fetch(new URL("/api/v1/verifier-jobs",url),{method:"POST",redirect:"error",headers:{authorization:`Bearer ${process.env.HODGEFORM_TOKEN}`,"content-type":"application/json"},body:JSON.stringify(result)});
    if(!response.ok)throw new Error(`Attestation submission rejected (${response.status}); local result retained`);
    console.log("Authenticated verifier evidence recorded");
  }else console.log("Signed worker result saved; deployment authority was not requested");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
