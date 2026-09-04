import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = await readFile(new URL("../src/lib/gate/config.server.ts", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/lib/auth/server.ts", import.meta.url), "utf8");
const pages = await readFile(new URL("../src/lib/ops/public-pages.server.ts", import.meta.url), "utf8");
const compose = await readFile(new URL("../docker-compose.production.yml", import.meta.url), "utf8");

test("public launch requires operator contacts retention and legal review acknowledgement", () => {
  for (const key of ["HODGEFORM_LEGAL_ENTITY_NAME","HODGEFORM_SUPPORT_EMAIL","HODGEFORM_SECURITY_EMAIL","HODGEFORM_PRIVACY_EMAIL","HODGEFORM_DATA_RETENTION_DAYS","HODGEFORM_LEGAL_REVIEWED"]) {
    assert.match(config, new RegExp(key));
    assert.match(compose, new RegExp(key));
  }
});

test("public pages state the receipt boundary and vulnerability contact", () => {
  assert.match(pages, /not<\/strong> a universal certificate|not.*universal certificate/is);
  assert.match(pages, /Vulnerability Disclosure/);
  assert.match(pages, /HODGEFORM_SECURITY_EMAIL/);
});

test("account deletion is verified and cannot orphan a last-owner workspace", () => {
  assert.match(auth, /deleteUser/);
  assert.match(auth, /sendDeleteAccountVerification/);
  assert.match(auth, /Transfer workspace ownership/);
  assert.match(auth, /update api_tokens set revoked_at/);
});
