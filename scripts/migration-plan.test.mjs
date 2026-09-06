import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { pendingMigrations, migrationName } from "./migration-plan.mjs";
test("migration plan keys by basename and orders files",()=>{assert.equal(migrationName("/migrations/0002_gate.sql"),"0002_gate.sql");assert.deepEqual(pendingMigrations(["/migrations/0002_gate.sql","/migrations/0001_auth.sql"],["0001_auth.sql"]),[{name:"0002_gate.sql",path:"/migrations/0002_gate.sql"}]);});
test("production tree contains auth and gate migrations",()=>{const files=readdirSync(new URL("../migrations",import.meta.url)).filter(x=>x.endsWith(".sql"));assert.deepEqual(files.sort(),["0001_auth.sql","0002_gate.sql","0003_api_tokens.sql","0004_workspaces.sql","0005_verifier_registry.sql","0006_admin_console.sql","0007_experiments.sql","0008_verifier_jobs.sql"]);});
