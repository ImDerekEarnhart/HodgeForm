import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = await readFile(new URL("../src/lib/gate/config.server.ts", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/lib/auth/server.ts", import.meta.url), "utf8");
const email = await readFile(new URL("../src/lib/auth/email.server.ts", import.meta.url), "utf8");
const pages = await readFile(new URL("../src/lib/ops/public-pages.server.ts", import.meta.url), "utf8");
const compose = await readFile(new URL("../docker-compose.production.yml", import.meta.url), "utf8");

test("public launch requires operator contacts retention and legal review acknowledgement", () => {
  for (const key of ["HODGEFORM_LEGAL_ENTITY_NAME","HODGEFORM_LEGAL_EFFECTIVE_DATE","HODGEFORM_SUPPORT_EMAIL","HODGEFORM_SECURITY_EMAIL","HODGEFORM_PRIVACY_EMAIL","HODGEFORM_DATA_RETENTION_DAYS","HODGEFORM_LEGAL_REVIEWED"]) {
    assert.match(config, new RegExp(key));
    assert.match(compose, new RegExp(key));
  }
});

test("controlled beta stays production-safe without impersonating public GA", () => {
  assert.match(config, /controlled_beta/);
  assert.match(config, /public_ga/);
  assert.match(config, /controlled beta must keep HODGEFORM_ALLOW_SIGNUPS=false/);
  assert.match(config, /channel === "public_ga"[\s\S]*HODGEFORM_LEGAL_REVIEWED/);
  assert.match(config, /const enforced = channel !== "development"/);
  assert.match(config, /process\.env\.NODE_ENV === "production" \? "controlled_beta" : "development"/);
  assert.match(compose, /HODGEFORM_RELEASE_CHANNEL:[^\n]*controlled_beta/);
  assert.match(compose, /HODGEFORM_ALLOW_SIGNUPS:[^\n]*false/);
});

test("auth email capture is limited to test or explicit development channels", () => {
  assert.match(email, /process\.env\.NODE_ENV === "test"/);
  assert.match(email, /HODGEFORM_RELEASE_CHANNEL === "development"/);
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

test("password reset revocation cannot be masked by a session cookie cache", () => {
  assert.match(auth, /revokeSessionsOnPasswordReset: true/);
  assert.match(auth, /cookieCache: \{ enabled: false \}/);
});
