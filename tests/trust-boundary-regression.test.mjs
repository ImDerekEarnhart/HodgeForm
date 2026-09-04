import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("production auth uses __Host- cookies to resist sibling-domain cookie tossing", async () => {
  const auth = await read("src/lib/auth/server.ts");
  for (const name of [
    "__Host-hodgeform-auth.session_token",
    "__Host-hodgeform-auth.session_data",
    "__Host-hodgeform-auth.account_data",
    "__Host-hodgeform-auth.dont_remember",
  ]) assert.match(auth, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(auth, /useSecureCookies:\s*false/);
  assert.match(auth, /secure:\s*production/);
});

test("canonical trust boundary does not persist private signing keys in application tables", async () => {
  const [crypto, migrations, service] = await Promise.all([
    read("src/lib/gate/crypto.server.ts"),
    read("migrations/0002_gate.sql"),
    read("src/lib/gate/service.server.ts"),
  ]);
  assert.doesNotMatch(migrations, /private_pem|release_keys/i);
  assert.doesNotMatch(service, /requireUserKeys|private_pem/i);
  assert.match(crypto, /keyPem\("PRIVATE"\)/);
  assert.match(crypto, /HODGEFORM_RECEIPT_\$\{name\}_KEY_PEM/);
});

test("canonical gate data model remains tenant-scoped rather than user-owned", async () => {
  const migration = await read("migrations/0002_gate.sql");
  for (const table of ["repositories", "release_candidates", "gate_plans", "evidence_receipts", "release_receipts", "discovery_commits"]) {
    const idx = migration.indexOf(`create table if not exists ${table}`);
    assert.ok(idx >= 0, `missing ${table}`);
    const fragment = migration.slice(idx, migration.indexOf(");", idx) + 2);
    assert.match(fragment, /tenant_id text not null/);
  }
});

test("static brand smoke is platform-neutral and part of release checks", async () => {
  const [pkg, smoke] = await Promise.all([read("package.json"), read("scripts/brand-smoke.mjs")]);
  assert.doesNotMatch(smoke, /\.grok\/skills|grok-pwa|app-env\.json/);
  assert.match(pkg, /brand:check/);
  assert.match(pkg, /npm run brand:check/);
});
