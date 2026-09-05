import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateReleaseKeys, signReceipt, verifySignedReceiptDocument } from "../src/lib/gate/crypto.server.ts";
import { deterministicAdversarialProposals } from "../src/lib/gate/falsifiers.ts";

const root = process.cwd();
const text = (path) => readFile(join(root, path), "utf8");

test("public brand surface coexists with a protected operator overview", async () => {
  const landing = await text("src/routes/index.tsx");
  const overview = await text("src/routes/overview.tsx");
  const shell = await text("src/components/app-shell.tsx");
  assert.match(landing, /When an AI system changes, what evidence must exist/);
  assert.match(landing, /Verify a receipt/);
  assert.match(overview, /RequireUser/);
  assert.match(shell, /"\/verify"/);
  assert.match(shell, /to: "\/overview"/);
});

test("web receipt verifier uses the deployment trust root and rejects BLOCK", () => {
  const keys = generateReleaseKeys();
  process.env.HODGEFORM_RECEIPT_PRIVATE_KEY_PEM = keys.privateKeyPem;
  process.env.HODGEFORM_RECEIPT_PUBLIC_KEY_PEM = keys.publicKeyPem;
  const releasePayload = { schema: "hodgeform-release-receipt/1", verdict: "RELEASE", artifactHash: "a".repeat(64) };
  const signedRelease = signReceipt(releasePayload);
  const releaseDoc = { schema: "hodgeform-signed-release/1", payload: releasePayload, receiptHash: signedRelease.receiptHash, signature: signedRelease.signatureB64, publicKeyFingerprint: signedRelease.publicKeyFingerprint };
  assert.equal(verifySignedReceiptDocument(releaseDoc).ok, true);
  const blockPayload = { ...releasePayload, verdict: "BLOCK" };
  const signedBlock = signReceipt(blockPayload);
  const blockDoc = { schema: "hodgeform-signed-release/1", payload: blockPayload, receiptHash: signedBlock.receiptHash, signature: signedBlock.signatureB64, publicKeyFingerprint: signedBlock.publicKeyFingerprint };
  const blocked = verifySignedReceiptDocument(blockDoc);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /not releasable/);
});

test("deterministic falsifier catalog remains available without a model", () => {
  const tests = deterministicAdversarialProposals(["HF-CAP-001", "HF-PAY-001", "HF-UNKNOWN-999"]);
  assert.equal(tests.length, 3);
  assert.match(tests[0].testIdea, /exact artifact/i);
  assert.match(tests[1].failureSignal, /unauthorized/i);
  assert.match(tests[2].title, /Obligation-specific/);
});

test("enterprise backend remains present behind the public UX", async () => {
  for (const path of [
    "migrations/0003_api_tokens.sql",
    "migrations/0004_workspaces.sql",
    "src/lib/gate/api-keys.server.ts",
    "src/lib/gate/tenant.server.ts",
    "src/lib/runtime/sandbox.server.ts",
    "src/lib/runtime/model-provider.server.ts",
    "src/routes/api/v1/candidates.ts",
    "bin/hodgeform.mjs",
    "docker-compose.production.yml",
  ]) await assert.doesNotReject(() => readFile(join(root, path)));
});

test("platform-builder preview/runtime baggage is not part of the production product", async () => {
  const pkg = JSON.parse(await text("package.json"));
  assert.equal(pkg.name, "hodgeform");
  assert.ok(pkg.bin?.hodgeform);
  assert.equal(pkg.scripts?.["manifest:check"], "node scripts/verify-source-manifest.mjs");
  assert.equal(pkg.scripts?.["release:check"], "npm run typecheck && npm run lint && npm run manifest:check && npm test && npm run trust:check && npm run brand:check && npm run build");
  await assert.rejects(() => readFile(join(root, "scripts/grok-pwa-plugin.mjs")));
  await assert.rejects(() => readFile(join(root, ".grok/app-env.json")));
});
