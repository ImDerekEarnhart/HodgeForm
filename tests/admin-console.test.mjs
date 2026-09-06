import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adminEmailAllowed, adminEmails, publicTrafficGroup } from "../src/lib/admin/policy.ts";

test("platform administrator allowlist uses exact normalized email matches", () => {
  assert.deepEqual([...adminEmails(" OWNER@Example.com, second@example.com ")], ["owner@example.com", "second@example.com"]);
  assert.equal(adminEmailAllowed("owner@example.com", "OWNER@example.com"), true);
  assert.equal(adminEmailAllowed("owner@example.com.attacker.test", "owner@example.com"), false);
  assert.equal(adminEmailAllowed(null, "owner@example.com"), false);
});

test("visitor analytics only classify public product pages", () => {
  assert.equal(publicTrafficGroup("/"), "landing");
  assert.equal(publicTrafficGroup("/login"), "auth");
  assert.equal(publicTrafficGroup("/privacy"), "legal");
  for (const path of ["/admin", "/overview", "/api/ready", "/assets/app.js"]) assert.equal(publicTrafficGroup(path), null);
});

test("admin data and actions are protected by server middleware", async () => {
  const [middleware, api, analytics, migration, route] = await Promise.all([
    readFile(new URL("../src/lib/admin/middleware.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/admin/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/ops/analytics.server.ts", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0006_admin_console.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/admin.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(middleware, /getSessionUser/);
  assert.match(middleware, /adminEmailAllowed/);
  assert.match(api, /middleware\(\[adminMiddleware\]\)/);
  assert.match(analytics, /createHmac/);
  assert.doesNotMatch(migration, /ip_address|user_agent/i);
  assert.match(route, /RequireUser/);
});
