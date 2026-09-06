#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import { admitPod, deploymentTargetSchema, verifyDeploymentReceipt } from "../src/lib/gate/deployment-admission.ts";
const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};
async function main(){
  if(!arg("--target")||!arg("--public-key"))throw new Error("Operator-owned --target JSON and --public-key PEM files are required");
  const target=deploymentTargetSchema.parse(JSON.parse(await readFile(arg("--target"),"utf8"))),publicKey=await readFile(arg("--public-key"),"utf8");
  if(!process.argv.includes("--serve")){
    if(!arg("--receipt")||!arg("--artifact-hash"))throw new Error("--receipt and --artifact-hash required");
    console.log(JSON.stringify(verifyDeploymentReceipt(JSON.parse(await readFile(arg("--receipt"),"utf8")),publicKey,target,arg("--artifact-hash"))));return;
  }
  for(const name of ["--tls-key","--tls-cert","--client-ca"])if(!arg(name))throw new Error(`Required: ${name}`);
  const server=createServer({key:await readFile(arg("--tls-key")),cert:await readFile(arg("--tls-cert")),ca:await readFile(arg("--client-ca")),requestCert:true,rejectUnauthorized:true},(req,res)=>{
    if(req.method!=="POST"||req.url!=="/validate"){res.writeHead(404);res.end();return;}
    let body="",bytes=0;
    req.on("data",chunk=>{bytes+=chunk.length;if(bytes>1024*1024){res.writeHead(413);res.end();req.destroy();}else body+=chunk;});
    req.on("end",()=>{
      let review;
      try{review=JSON.parse(body);const response=admitPod(review,publicKey,target);res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({apiVersion:"admission.k8s.io/v1",kind:"AdmissionReview",response}));}
      catch{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({apiVersion:"admission.k8s.io/v1",kind:"AdmissionReview",response:{uid:review?.request?.uid??"",allowed:false,status:{message:"HodgeForm admission denied: exact current signed release required"}}}));}
    });
  });
  server.requestTimeout=10_000;server.headersTimeout=10_000;
  server.listen(Number(arg("--port")??8443),"0.0.0.0",()=>console.log("HodgeForm admission listening with mutual TLS; only the configured namespace is eligible"));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
