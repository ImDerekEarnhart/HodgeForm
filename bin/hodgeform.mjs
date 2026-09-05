#!/usr/bin/env node
import { createHash, createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
function canonicalize(value){if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonicalize).join(",")}]`;return`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;}
function sha256(v){return createHash("sha256").update(Buffer.isBuffer(v)?v:typeof v==="string"?v:canonicalize(v)).digest("hex");}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;}
function usage(){console.log(`HodgeForm CLI

  hodgeform init [--force]
  hodgeform hash <artifact-or-directory>
  hodgeform scan <source-or-directory> [--out hodgeform.scan.json]
  hodgeform keys generate [--out-dir .hodgeform/keys]
  hodgeform repository list
  hodgeform repository create <name> [--description text]
  hodgeform candidate submit [hodgeform.agent.json]
  hodgeform candidate show <candidate-id>
  hodgeform gate explain <candidate-id>
  hodgeform receipt fetch <candidate-id> [--out receipt.json]
  hodgeform evidence record <candidate-id> --requirement HF-... --kind deterministic_test --outcome pass --source ci [--payload result.json]
  hodgeform receipt verify <receipt.json> --public-key <hodgeform.pub>
  hodgeform gate verify <receipt.json> --public-key <hodgeform.pub>
  hodgeform demo
  hodgeform benchmark

API commands use HODGEFORM_URL and HODGEFORM_TOKEN.`);}
async function init(){const path=resolve("hodgeform.agent.json");try{await readFile(path);if(!process.argv.includes("--force"))throw new Error(`${path} already exists (use --force to replace)`);}catch(e){if(e?.code!=="ENOENT"&&!String(e.message).includes("already exists"))throw e;if(String(e.message).includes("already exists"))throw e;}const template={schema:"hodgeform-agent/1",repositorySlug:"my-agent",name:"my-agent",version:"v1",artifactPath:"./src",framework:"custom",policy:{pack:"auto",dataClass:"internal"},capabilities:[]};await writeFile(path,JSON.stringify(template,null,2)+"\n");console.log(`Created ${path}\nSet repositorySlug and artifactPath. candidate submit will hash and scan the exact artifact automatically.`);}
const IGNORE=new Set(["node_modules",".git",".output","dist","coverage"]);
async function filesUnder(input){const root=resolve(input),out=[];async function walk(p,rel=""){const st=await stat(p);if(st.isFile()){out.push({path:p,rel:rel||p.split("/").pop()});return;}if(!st.isDirectory())return;for(const name of (await readdir(p)).sort()){if(IGNORE.has(name))continue;await walk(join(p,name),rel?`${rel}/${name}`:name);}}await walk(root);return out;}
async function artifactDigest(input){const files=await filesUnder(input);const h=createHash("sha256");for(const f of files){h.update(f.rel);h.update("\\0");h.update(await readFile(f.path));h.update("\\0");}return h.digest("hex");}
const SCAN_RULES=[
 ["shell.execute",/(child_process|execFile|execSync|spawn\s*\(|subprocess\.|os\.system\s*\()/i],
 ["filesystem.write",/(writeFile|appendFile|unlink\s*\(|rmSync|rmdir|os\.remove|shutil\.rmtree|open\s*\([^\n]{0,120}["'](?:w|a|x))/i],
 ["filesystem.read",/(readFile|createReadStream|fs\.read|open\s*\([^\n]{0,120}["']r)/i],
 ["network.outbound",/(fetch\s*\(|axios\.|requests\.|urllib|http\.request|https\.request|socket\.)/i],
 ["database.write",/(\bINSERT\b|\bUPDATE\b|\bDELETE\b|\.insert\s*\(|\.update\s*\(|\.delete\s*\()/i],
 ["database.read",/(\bSELECT\b|\.select\s*\()/i],
 ["external_action.send_message",/(chat\.postMessage|slack.*send|send_message|messages\.create)/i],
 ["external_action.email",/(nodemailer|sendMail\s*\(|smtplib|send_email)/i],
 ["payment.execute",/(stripe|payment_intent|paymentIntent|charge\.create|payments\.create)/i],
 ["secrets.read",/(process\.env|os\.environ|getenv\s*\(|secret[_-]?manager|vault)/i],
];
async function scanPath(input){const files=await filesUnder(input),findings=[];let bytes=0,scanned=0,skipped=0;for(const f of files){const b=await readFile(f.path);bytes+=b.length;if(bytes>10_000_000||files.length>1000){skipped++;continue;}if(b.includes(0)){skipped++;continue;}const text=b.toString("utf8");scanned++;const lines=text.split(/\r?\n/);for(let i=0;i<lines.length;i++)for(const [cap,re] of SCAN_RULES)if(re.test(lines[i]))findings.push({capability:cap,file:f.rel,line:i+1,snippet:lines[i].trim().slice(0,180)});}const detectedCapabilities=[...new Set(findings.map(x=>x.capability))].sort();return{schema:"hodgeform-capability-scan/1",complete:skipped===0,coverage:{filesTotal:files.length,filesScanned:scanned,filesSkipped:skipped,bytes},detectedCapabilities,recommendedPack:recommendPack(detectedCapabilities),findings};}
async function hashFile(){const file=process.argv[3];if(!file)throw new Error("artifact path required");console.log(await artifactDigest(file));}
async function scanCommand(){const input=process.argv[3];if(!input)throw new Error("source path required");const report={...(await scanPath(input)),artifactHash:await artifactDigest(input)};const text=JSON.stringify(report,null,2)+"\n";const out=arg("--out");if(out){await writeFile(resolve(out),text);console.log(`Wrote ${resolve(out)}\nDetected: ${report.detectedCapabilities.join(", ")||"none"}`);}else console.log(text);}
async function keys(){const out=resolve(arg("--out-dir")??".hodgeform/keys");await mkdir(out,{recursive:true,mode:0o700});const kp=generateKeyPairSync("ed25519");const priv=kp.privateKey.export({type:"pkcs8",format:"pem"}).toString();const pub=kp.publicKey.export({type:"spki",format:"pem"}).toString();await writeFile(join(out,"hodgeform-private.pem"),priv,{mode:0o600,flag:"wx"});await writeFile(join(out,"hodgeform.pub"),pub,{mode:0o644,flag:"wx"});console.log(`Generated Ed25519 release authority\nprivate: ${join(out,"hodgeform-private.pem")}\npublic:  ${join(out,"hodgeform.pub")}\nfingerprint: ${sha256(kp.publicKey.export({type:"spki",format:"der"}))}\n\nImport the private PEM through your deployment secret manager; it is never printed.\nKeep the private key only on the HodgeForm release authority. Pin the public key separately in CI.\nExisting key files are never overwritten; use a new directory for rotation.`);}
function apiConfig(){const base=process.env.HODGEFORM_URL?.replace(/\/+$/,"");const token=process.env.HODGEFORM_TOKEN;if(!base||!token)throw new Error("Set HODGEFORM_URL and HODGEFORM_TOKEN for API commands");return{base,token};}
async function api(path,{method="GET",body}={}){const{base,token}=apiConfig();const res=await fetch(`${base}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});const text=await res.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}if(!res.ok)throw new Error(data.error??`HTTP ${res.status}`);return data;}
function recommendPack(capabilities){
  const set=new Set(capabilities);
  if(set.has("payment.execute")||set.has("data.phi"))return "high-risk";
  if(set.has("shell.execute")||set.has("filesystem.write"))return "code-execution";
  if(set.has("database.write")||set.has("external_action.send_message")||set.has("external_action.email"))return "action-taking";
  if(set.has("network.outbound"))return "networked";
  return "basic";
}
async function repositoryList(){const result=await api("/api/v1/repositories");console.log(JSON.stringify(result,null,2));}
async function repositoryCreate(){const name=process.argv[4];if(!name)throw new Error("repository name required");const result=await api("/api/v1/repositories",{method:"POST",body:{name,description:arg("--description")}});console.log(JSON.stringify(result,null,2));}
async function candidateSubmit(){const file=resolve(process.argv[4]??"hodgeform.agent.json");const c=JSON.parse(await readFile(file,"utf8"));let artifactHash=c.artifactHash,scan=null;if(c.artifactPath){artifactHash=await artifactDigest(c.artifactPath);scan={...(await scanPath(c.artifactPath)),artifactHash};if(c.artifactHash&&c.artifactHash!=="REPLACE_WITH_SHA256"&&c.artifactHash!==artifactHash)throw new Error("Configured artifactHash does not match artifactPath bytes");}if(!/^[a-f0-9]{64}$/i.test(artifactHash??""))throw new Error("Set artifactPath or a valid artifactHash");const capabilities=[...new Set([...(c.capabilities??[]),...(scan?.detectedCapabilities??[])])].sort();const requestedPack=c.policy?.pack??"auto";const resolvedPack=requestedPack==="auto"?recommendPack(capabilities):requestedPack;const intent={...(c.policy??{}),pack:resolvedPack,dataClass:c.policy?.dataClass??"internal"};const body={repositoryId:c.repositoryId,repositorySlug:c.repositorySlug,version:c.version,artifactHash,manifest:{name:c.name,framework:c.framework,description:c.description,artifactUri:c.artifactUri,capabilities,metadata:c.metadata},intent};const result=await api("/api/v1/candidates",{method:"POST",body});if(scan){await api(`/api/v1/candidates/${encodeURIComponent(result.candidateId)}/evidence`,{method:"POST",body:{requirementId:"HF-CAP-001",evidenceKind:"static_analysis",outcome:scan.complete?"pass":"inconclusive",source:"hodgeform-cli-scanner/1",payload:scan}});}console.log(JSON.stringify({...result,artifactHash,detectedCapabilities:scan?.detectedCapabilities??[],recommendedPack:resolvedPack},null,2));}
async function candidateShow(){const id=process.argv[4];if(!id)throw new Error("candidate id required");console.log(JSON.stringify(await api(`/api/v1/candidates/${encodeURIComponent(id)}`),null,2));}
async function gateExplain(){
  const id=process.argv[4];
  if(!id)throw new Error("candidate id required");
  const d=await api(`/api/v1/candidates/${encodeURIComponent(id)}`);
  const t=d.trustTransition??{};
  const added=t.changed?.addedCapabilities??[];
  const removed=t.changed?.removedCapabilities??[];
  const changedLines=[
    ...(added.length?added.map(c=>`  + ${c}`):["  no new authority"]),
    ...removed.map(c=>`  - ${c}`),
  ];
  const obligationLines=(d.verdicts??[]).map(v=>`  ${String(v.status).toUpperCase().padEnd(7)} ${v.requirement.id} ${v.requirement.title}`);
  console.log([
    "HodgeForm trust transition",
    "",
    "What changed",
    ...changedLines,
    "",
    "What must be proven",
    ...(obligationLines.length?obligationLines:["  no compiled obligations returned"]),
    "",
    "What evidence counts",
    "  typed evidence + minimum independence; LLM PASS is non-authoritative for blocking obligations",
    "",
    "Who can approve",
    `  ${t.approval?.requiredRole??"authorized human"}${t.approval?.separateFromCreator?"; must differ from candidate creator":""}`,
    "",
    `artifact ${d.candidate?.artifact_hash??"unknown"}`,
    `policy   ${d.plan?.policy_hash??"unknown"}`,
  ].join("\n"));
}
async function receiptFetch(){const id=process.argv[4];if(!id)throw new Error("candidate id required");const doc=await api(`/api/v1/candidates/${encodeURIComponent(id)}/receipt`);const text=JSON.stringify(doc,null,2)+"\n";const out=arg("--out");if(out){await writeFile(resolve(out),text);console.log(`Wrote ${resolve(out)}`);}else console.log(text);}
async function evidenceRecord(){const id=process.argv[4],requirementId=arg("--requirement"),kind=arg("--kind"),outcome=arg("--outcome")??"pass",source=arg("--source")??"ci";if(!id||!requirementId||!kind)throw new Error("candidate id, --requirement and --kind are required");let payload={};const p=arg("--payload");if(p)payload=JSON.parse(await readFile(resolve(p),"utf8"));const result=await api(`/api/v1/candidates/${encodeURIComponent(id)}/evidence`,{method:"POST",body:{requirementId,evidenceKind:kind,outcome,source,payload}});console.log(JSON.stringify(result,null,2));}
function runBundledScript(relativePath){const script=fileURLToPath(new URL(relativePath,import.meta.url));const r=spawnSync(process.execPath,["--experimental-strip-types",script],{stdio:"inherit"});if(r.error)throw r.error;if(r.status!==0)throw new Error(`Bundled command failed with exit code ${r.status}`);}
async function trustDemo(){runBundledScript("../scripts/trust-boundary-demo.mjs");}
async function trustBenchmark(){runBundledScript("../scripts/trustbench.mjs");}
async function verifyReceipt(){const file=process.argv[4];const pubPath=arg("--public-key");if(!file||!pubPath){usage();process.exit(2);}const doc=JSON.parse(await readFile(resolve(file),"utf8"));if(doc.schema!=="hodgeform-signed-release/1"||!doc.payload||!doc.receiptHash||!doc.signature)throw new Error("Unsupported or incomplete HodgeForm receipt");const canonical=canonicalize(doc.payload),hash=sha256(canonical);if(hash!==doc.receiptHash)throw new Error("Receipt hash mismatch: payload was changed");const pubPem=await readFile(resolve(pubPath),"utf8"),key=createPublicKey(pubPem),fingerprint=sha256(key.export({type:"spki",format:"der"}));if(fingerprint!==doc.publicKeyFingerprint)throw new Error("Pinned public key fingerprint does not match receipt signer");if(!verify(null,Buffer.from(canonical),key,Buffer.from(doc.signature,"base64")))throw new Error("Ed25519 signature verification failed");if(doc.payload.verdict!=="RELEASE"){console.error(`HodgeForm gate: ${doc.payload.verdict}`);process.exit(3);}console.log(`HodgeForm gate: RELEASE\nreceipt: ${doc.receiptHash}\nartifact: ${doc.payload?.candidate?.artifactHash??"unknown"}\nsigner: ${doc.signerId??"unknown"}`);}
try{const [cmd,sub]=process.argv.slice(2);if(cmd==="init")await init();else if(cmd==="hash")await hashFile();else if(cmd==="scan")await scanCommand();else if(cmd==="keys"&&sub==="generate")await keys();else if(cmd==="repository"&&sub==="list")await repositoryList();else if(cmd==="repository"&&sub==="create")await repositoryCreate();else if(cmd==="candidate"&&sub==="submit")await candidateSubmit();else if(cmd==="candidate"&&sub==="show")await candidateShow();else if(cmd==="receipt"&&sub==="fetch")await receiptFetch();else if(cmd==="evidence"&&sub==="record")await evidenceRecord();else if((cmd==="receipt"||cmd==="gate")&&sub==="verify")await verifyReceipt();else if(cmd==="gate"&&sub==="explain")await gateExplain();else if(cmd==="demo")await trustDemo();else if(cmd==="benchmark")await trustBenchmark();else{usage();if(cmd)process.exitCode=2;}}catch(e){console.error(`HodgeForm: ${e instanceof Error?e.message:String(e)}`);process.exit(2);}
