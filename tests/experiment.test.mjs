import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { experimentProtocolSchema, evaluateExperiment } from "../src/lib/gate/experiment.ts";

const protocol={scope:"Finite representation collision fixture only",hypotheses:["Position is sufficient","Direction is necessary"],protocol:"Freeze the representation and evaluate untouched cases.",developmentDataHash:"a".repeat(64),holdoutDataHash:"b".repeat(64),antiRescueRules:"No threshold or representation edits after reveal",criteria:[{id:"gap",requirementId:"HF-EVO-representation-direction",metric:"collision_count",comparison:"eq",threshold:0}]};
const req=protocol.criteria[0].requirementId, minimum={[req]:"independent"};
const evidence={id:"e1",requirementId:req,outcome:"pass",independence:"independent",authenticated:true,experimentHash:"frozen",measurements:{collision_count:0}};
const evaluate=rows=>evaluateExperiment(protocol,"frozen",rows,minimum);
test("discovery survival requires authenticated exact experiment evidence",()=>{
  assert.equal(evaluate([]).status,"inconclusive");
  for(const change of [{authenticated:false},{experimentHash:"other"},{independence:"same_team"},{measurements:{}},{measurements:{collision_count:"0"}},{measurements:{collision_count:NaN}}]) assert.equal(evaluate([{...evidence,...change}]).status,"inconclusive");
  assert.equal(evaluate([evidence]).status,"survived");
  assert.equal(evaluate([evidence]).activationAuthority,false);
});
test("a counterexample remains refuting after additional passes",()=>{
  assert.equal(evaluate([evidence,{...evidence,id:"e2",measurements:{collision_count:1}},evidence]).status,"refuted");
  assert.equal(evaluate([evidence,{...evidence,id:"e2",outcome:"fail",measurements:{}}]).status,"refuted");
});
test("prospective protocol rejects reused data and duplicate criteria",()=>{
  assert.equal(experimentProtocolSchema.safeParse(protocol).success,true);
  assert.equal(experimentProtocolSchema.safeParse({...protocol,holdoutDataHash:protocol.developmentDataHash}).success,false);
  assert.equal(experimentProtocolSchema.safeParse({...protocol,criteria:[...protocol.criteria,...protocol.criteria]}).success,false);
});
test("database prevents rewriting or deleting frozen experiments and evaluations",async()=>{
  const db=new PGlite();
  try {
    await db.exec('create table discovery_commits(id text primary key); create table release_candidates(id text primary key); create table evidence_receipts(id text primary key);');
    await db.exec(await readFile(new URL('../migrations/0007_experiments.sql',import.meta.url),'utf8'));
    await db.exec("insert into discovery_commits values('d'); insert into release_candidates values('c'); insert into discovery_experiments(id,tenant_id,discovery_id,candidate_id,frozen_json,experiment_hash,created_by) values('x','t','d','c','{}','h','u'); insert into discovery_evaluations(id,tenant_id,experiment_id,result_json,result_hash,created_by) values('e','t','x','{}','r','u');");
    for(const table of ['discovery_experiments','discovery_evaluations']) {
      await assert.rejects(db.exec(`delete from ${table}`),/append-only/);
      await assert.rejects(db.exec(`update ${table} set created_by='forged'`),/append-only/);
    }
    await assert.rejects(db.exec("insert into discovery_evaluations(id,tenant_id,experiment_id,result_json,result_hash,created_by) values('e2','t','unfrozen','{}','r','u')"),/foreign key/);
  }finally{await db.close();}
});
