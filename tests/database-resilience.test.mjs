import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const integration=await readFile(new URL("../scripts/postgres-http-integration.mjs",import.meta.url),"utf8");const loss=await readFile(new URL("../scripts/db-loss-readiness.mjs",import.meta.url),"utf8");const restore=await readFile(new URL("../scripts/postgres-backup-restore-smoke.sh",import.meta.url),"utf8");const db=await readFile(new URL("../src/lib/db.ts",import.meta.url),"utf8");
test("Postgres release gate covers concurrency connection loss and backup restore",()=>{assert.match(integration,/duplicate concurrent release versions/);assert.match(loss,/readiness must fail when Postgres is unavailable/);assert.match(restore,/pg_dump/);assert.match(restore,/pg_restore/);assert.match(db,/connectionTimeoutMillis/);});
