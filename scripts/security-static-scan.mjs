#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
const root=process.cwd(); const skip=new Set([".git","node_modules",".output","dist","coverage"]); const findings=[];
async function walk(dir){for(const name of await readdir(dir)){if(skip.has(name))continue;const p=join(dir,name),s=await stat(p);if(s.isDirectory())await walk(p);else if(s.isFile()&&!/\.(jpg|jpeg|png|gif|webp|ico|zip|pdf)$/i.test(name)){let text;try{text=await readFile(p,"utf8")}catch{continue}const rel=relative(root,p);
  const rules=[
    ["private-key",/-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/],
    ["live-api-token",/hf_live_[A-Za-z0-9_-]{24,}/],
    ["cloud-secret",/(?:AWS_SECRET_ACCESS_KEY|AZURE_CLIENT_SECRET|GOOGLE_APPLICATION_CREDENTIALS)\s*[:=]\s*["'][^"']{12,}/],
    ["hardcoded-bearer",/Authorization\s*[:=]\s*["']Bearer\s+[A-Za-z0-9._-]{24,}/i],
  ];
  for(const [kind,re] of rules)if(re.test(text))findings.push({kind,file:rel});
  if(rel.startsWith("src/") && /from\s+["']node:child_process["']|require\(["']child_process["']\)/.test(text))findings.push({kind:"web-child-process",file:rel});
}}
}
await walk(root);
if(findings.length){console.error(JSON.stringify({status:"FAIL",findings},null,2));process.exit(1)}
console.log(JSON.stringify({status:"PASS",files:"source tree",rules:["private-key","live-api-token","cloud-secret","hardcoded-bearer","web-child-process"]}));
