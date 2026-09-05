#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";

const databaseUrl=process.env.DATABASE_URL;if(!databaseUrl)throw new Error("DATABASE_URL is required");
const suffix=randomBytes(5).toString("hex"),email=`auth-${suffix}@example.test`,password="Correct-Horse-Battery-123!",newPassword="New-Correct-Horse-456!";
const port=Number(process.env.HODGEFORM_AUTH_INTEGRATION_PORT||3312),base=`http://127.0.0.1:${port}`;
const dir=await mkdtemp(join(tmpdir(),"hf-auth-")),capture=join(dir,"email.jsonl");
const pool=new pg.Pool({connectionString:databaseUrl}); let child;
async function http(path,{method="GET",body,cookie}={}){const res=await fetch(`${base}${path}`,{method,redirect:"manual",headers:{...(body?{"content-type":"application/json"}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await res.text();let data;try{data=JSON.parse(text)}catch{data=text}return{res,data,text};}
async function waitReady(){for(let i=0;i<100;i++){try{if((await fetch(`${base}/api/health`)).status===200)return}catch{/* Retry while the application starts. */}await sleep(100)}throw new Error("auth test app did not start")}
async function nextEmail(subject,after=0){for(let i=0;i<100;i++){try{const lines=(await readFile(capture,"utf8")).trim().split(/\n/).filter(Boolean).map(JSON.parse);const found=lines.slice(after).find(x=>x.subject===subject);if(found)return{mail:found,count:lines.length}}catch{/* The capture file is not created until the first email. */}await sleep(50)}throw new Error(`email not captured: ${subject}`)}
function firstUrl(text){const m=String(text).match(/https?:\/\/[^\s]+/);if(!m)throw new Error(`no URL in captured email: ${text}`);return m[0]}
function cookieFrom(res){const raw=res.headers.get("set-cookie");if(!raw) return "";return raw.split(/,(?=[^;]+?=)/).map(x=>x.split(";",1)[0]).join("; ")}
try{
 child=spawn(process.execPath,[".output/server/index.mjs"],{env:{...process.env,NODE_ENV:"test",PORT:String(port),HOST:"127.0.0.1",HODGEFORM_RELEASE_CHANNEL:"development",HODGEFORM_PUBLIC_RELEASE:"false",VITE_AUTH_ENABLED:"true",HODGEFORM_EMAIL_PASSWORD_AUTH:"true",HODGEFORM_ALLOW_SIGNUPS:"true",HODGEFORM_MIN_PASSWORD_LENGTH:"12",BETTER_AUTH_URL:base,BETTER_AUTH_SECRET:"auth-integration-secret-0123456789-abcdefghijklmnopqrstuvwxyz",HODGEFORM_DEPLOYMENT_MODE:"saas",HODGEFORM_EMAIL_CAPTURE_FILE:capture},stdio:["ignore","pipe","pipe"]});
 child.stdout.on("data",d=>process.stdout.write(`[auth-app] ${d}`)); child.stderr.on("data",d=>process.stderr.write(`[auth-app] ${d}`)); await waitReady();
 let r=await http("/api/auth/sign-up/email",{method:"POST",body:{name:"Auth Integration",email,password}});assert.ok(r.res.status>=200&&r.res.status<300,`signup failed ${r.res.status}: ${r.text}`);
 const verify=await nextEmail("Verify your HodgeForm account");const verifyUrl=firstUrl(verify.mail.text);const vr=await fetch(verifyUrl,{redirect:"manual"});assert.ok([200,302,303,307].includes(vr.status),`verify email failed ${vr.status}`);
 const user=await pool.query(`select "emailVerified" from "user" where email=$1`,[email]);assert.equal(user.rows[0]?.emailVerified,true,"email must be verified in database");
 r=await http("/api/auth/sign-in/email",{method:"POST",body:{email,password}});assert.ok(r.res.status>=200&&r.res.status<300,`verified sign-in failed ${r.res.status}: ${r.text}`);const cookie=cookieFrom(r.res);assert.ok(cookie,"sign-in must establish session cookie");
 r=await http("/api/auth/get-session",{cookie});assert.equal(r.res.status,200);assert.equal(r.data?.user?.email,email);
 r=await http("/api/auth/request-password-reset",{method:"POST",body:{email,redirectTo:`${base}/reset-password`}});assert.ok(r.res.status>=200&&r.res.status<300,`reset request failed ${r.res.status}: ${r.text}`);
 const reset=await nextEmail("Reset your HodgeForm password",verify.count);const resetUrl=new URL(firstUrl(reset.mail.text));const token=resetUrl.searchParams.get("token");assert.ok(token,"password reset email must carry token");
 r=await http("/api/auth/reset-password",{method:"POST",body:{newPassword,token}});assert.ok(r.res.status>=200&&r.res.status<300,`reset failed ${r.res.status}: ${r.text}`);
 r=await http("/api/auth/get-session",{cookie});assert.ok(!r.data?.user,"password reset must revoke the prior session");
 r=await http("/api/auth/sign-in/email",{method:"POST",body:{email,password}});assert.ok(r.res.status>=400,"old password must stop working");
 r=await http("/api/auth/sign-in/email",{method:"POST",body:{email,newPassword}});assert.ok(r.res.status>=200&&r.res.status<300,"new password must work");
 let throttled=false;for(let i=0;i<12;i++){const x=await http("/api/auth/sign-in/email",{method:"POST",body:{email:`missing-${suffix}@example.test`,password:"definitely-wrong-password"}});if(x.res.status===429){throttled=true;break}}assert.equal(throttled,true,"repeated sign-in attempts must be throttled");
 console.log("auth HTTP integration: PASS");
}finally{
 if(child){child.kill("SIGTERM");await Promise.race([new Promise(r=>child.once("exit",r)),sleep(1500)]);if(child.exitCode==null)child.kill("SIGKILL")}
 try{const u=await pool.query(`select id from "user" where email=$1`,[email]);if(u.rows[0])await pool.query(`delete from "user" where id=$1`,[u.rows[0].id])}catch{/* Preserve the original test failure if best-effort cleanup cannot run. */}
 await pool.end();await rm(dir,{recursive:true,force:true});
}
