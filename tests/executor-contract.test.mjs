import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = await readFile(new URL("../src/lib/gate/config.server.ts", import.meta.url), "utf8");
const compose = await readFile(new URL("../docker-compose.production.yml", import.meta.url), "utf8");
const smoke = await readFile(new URL("../scripts/executor-container-smoke.sh", import.meta.url), "utf8");

test("public executor configuration requires a nontrivial service token", () => {
  assert.match(config, /executor requires HODGEFORM_SANDBOX_TOKEN/);
  assert.match(config, /< 24/);
  assert.match(compose, /HODGEFORM_SANDBOX_TOKEN:\s*\$\{HODGEFORM_SANDBOX_TOKEN:\?/);
});

test("executor container contract keeps no-network and resource limits", () => {
  assert.match(compose, /network_mode:\s*none/);
  assert.match(compose, /read_only:\s*true/);
  assert.match(compose, /pids_limit:\s*64/);
  assert.match(compose, /mem_limit:\s*256m/);
  assert.match(compose, /cpus:\s*0\.5/);
  assert.match(smoke, /--network none/);
  assert.match(smoke, /401 Unauthorized/);
});
