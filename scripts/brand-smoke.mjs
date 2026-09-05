#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? process.cwd());
const checks = [];
const fail = (name, detail) => checks.push({ name, ok: false, detail });
const pass = (name, detail) => checks.push({ name, ok: true, detail });

async function text(rel) { return readFile(resolve(root, rel), "utf8"); }

try {
  const [rootRoute, landing] = await Promise.all([
    text("src/routes/__root.tsx"),
    text("src/routes/index.tsx"),
  ]);
  if (/HodgeForm/.test(rootRoute) && /HodgeForm/.test(landing)) pass("brand-name", "HodgeForm is present in public metadata and landing");
  else fail("brand-name", "HodgeForm missing from public metadata or landing");
  if (/Trust compiler/i.test(rootRoute + landing)) pass("positioning", "trust-compiler positioning present");
  else fail("positioning", "trust-compiler positioning missing");
  if (/Verify a receipt/i.test(landing)) pass("receipt-cta", "public receipt verification CTA present");
  else fail("receipt-cta", "public receipt verification CTA missing");
  const publicSurface = rootRoute + "\n" + landing;
  if (/Grok App Builder|og\.grok\.me|DIRECTOR/i.test(publicSurface)) fail("stale-platform-brand", "public HodgeForm surface contains stale platform branding");
  else pass("stale-platform-brand", "no stale Grok/App Builder branding in public surface");
} catch (err) {
  fail("public-source", String(err));
}

try {
  const og = await stat(resolve(root, "public/og.jpg"));
  if (og.size > 0 && og.size <= 600 * 1024) pass("og-card", `public/og.jpg is ${og.size} bytes`);
  else fail("og-card", `public/og.jpg is ${og.size} bytes; expected 1..614400`);
} catch (err) {
  fail("og-card", `missing/unreadable public/og.jpg: ${err}`);
}

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}: ${c.detail}`);
if (checks.some((c) => !c.ok)) process.exit(1);
