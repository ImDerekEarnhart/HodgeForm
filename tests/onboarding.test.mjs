import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
test("automated golden path stays below ten policy lines and ten minutes of machine time",()=>{
  const run=spawnSync(process.execPath,[fileURLToPath(new URL("../scripts/golden-path-smoke.mjs",import.meta.url))],{encoding:"utf8"});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(run.stdout.trim());
  assert.equal(result.status,"PASS");
  assert.ok(result.policyLines<10);
  assert.ok(result.elapsedMs<600000);
});
test("quickstart teaches auto policy rather than a formal DSL",async()=>{
  const text=await readFile(new URL("../docs/QUICKSTART.md",import.meta.url),"utf8");
  assert.match(text,/policy\.pack.*auto/s);
  assert.match(text,/should not need to author formal logic/i);
});
