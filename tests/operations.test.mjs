import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
const readiness = await readFile(new URL("../src/lib/ops/readiness.server.ts", import.meta.url), "utf8");
const ops = await readFile(new URL("../docs/OPERATIONS.md", import.meta.url), "utf8");
const incident = await readFile(new URL("../docs/INCIDENT_RESPONSE.md", import.meta.url), "utf8");

test("liveness and readiness are separate and readiness checks Postgres", () => {
  assert.match(server, /\/api\/health/);
  assert.match(server, /\/api\/ready/);
  assert.match(readiness, /select 1 as ok/i);
});

test("server emits request ids and structured operational events", () => {
  assert.match(server, /X-Request-Id/);
  assert.match(server, /logEvent/);
  assert.match(server, /http_unhandled_error/);
});

test("operator docs cover backup restore migrations rollback and key compromise", () => {
  for (const phrase of ["Back up", "migrations", "Rollback", "restore"]) assert.match(ops, new RegExp(phrase, "i"));
  for (const phrase of ["signing-key compromise", "rotate", "tenant-boundary"]) assert.match(incident, new RegExp(phrase, "i"));
});

test("invite-only beta has a guarded first-operator procedure", async () => {
  const [script, workflow] = await Promise.all([
    readFile(new URL("../scripts/provision-operator.mjs", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8"),
  ]);
  assert.match(script, /HODGEFORM_OPERATOR_PASSWORD/);
  assert.match(script, /PROVISION_OPERATOR:/);
  assert.match(script, /emailVerified[^\n]*true/);
  assert.doesNotMatch(script, /process\.argv\[[^\]]+\][^\n]*password/i);
  assert.match(ops, /Controlled-beta operator provisioning/);
  assert.match(workflow, /operator-provisioning-smoke\.mjs/);
});
