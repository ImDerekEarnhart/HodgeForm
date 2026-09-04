import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const workflow = await readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
const integration = await readFile(new URL("../scripts/postgres-http-integration.mjs", import.meta.url), "utf8");
test("release CI has a real Postgres service and live HTTP isolation test", () => {
  assert.match(workflow, /postgres:17-alpine/);
  assert.match(workflow, /postgres-http-integration\.mjs/);
  assert.match(integration, /cross-tenant candidate read/);
  assert.match(integration, /membership removal must invalidate old workspace token/);
  assert.match(integration, /revoked API token must fail immediately/);
});
