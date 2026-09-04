#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root=resolve(new URL("..",import.meta.url).pathname); const dir=await mkdtemp(join(tmpdir(),"hodgeform-golden-"));
const started=performance.now();
try{
  await mkdir(join(dir,"src"));
  await writeFile(join(dir,"src","agent.js"),`export async function act(){ const r=await fetch("https://example.invalid"); return r.status }\n`);
  const init=spawnSync(process.execPath,[join(root,"bin/hodgeform.mjs"),"init"],{cwd:dir,encoding:"utf8"});
  assert.equal(init.status,0,init.stderr);
  const doc=JSON.parse(await readFile(join(dir,"hodgeform.agent.json"),"utf8"));
  assert.equal(doc.policy.pack,"auto");
  doc.repositorySlug="golden-agent"; doc.artifactPath="./src";
  await writeFile(join(dir,"hodgeform.agent.json"),JSON.stringify(doc,null,2)+"\n");
  const scan=spawnSync(process.execPath,[join(root,"bin/hodgeform.mjs"),"scan","./src"],{cwd:dir,encoding:"utf8"});
  assert.equal(scan.status,0,scan.stderr);
  const report=JSON.parse(scan.stdout);
  assert.ok(report.detectedCapabilities.includes("network.outbound"));
  assert.equal(report.recommendedPack,"networked");
  const policyLines=JSON.stringify(doc.policy,null,2).split("\n").length-2;
  assert.ok(policyLines<10,`expected <10 policy lines, got ${policyLines}`);
  const elapsed=performance.now()-started;
  assert.ok(elapsed<10*60*1000);
  console.log(JSON.stringify({status:"PASS",elapsedMs:Math.round(elapsed),policyLines,recommendedPack:report.recommendedPack}));
}finally{await rm(dir,{recursive:true,force:true});}
