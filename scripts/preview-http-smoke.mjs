#!/usr/bin/env node
// Exercise the built server's embedded development database, not the source loader.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const directory = await mkdtemp(join(tmpdir(), "hf-preview-"));
const port = Number(process.env.HODGEFORM_PREVIEW_TEST_PORT || 3314);
const base = `http://127.0.0.1:${port}`;
const capture = join(directory, "email.jsonl");
let child;
let output = "";

async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((done) => child.once("exit", done));
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(2000)]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([exited, sleep(2000)]);
  }
}

async function start(signups) {
  output = "";
  child = spawn(process.execPath, [".output/server/index.mjs"], {
    env: {
      ...process.env, NODE_ENV: "test", HOST: "127.0.0.1", PORT: String(port),
      DATABASE_URL: "", VITE_AUTH_ENABLED: "true", HODGEFORM_RELEASE_CHANNEL: "development",
      HODGEFORM_EMAIL_PASSWORD_AUTH: "true", HODGEFORM_ALLOW_SIGNUPS: String(signups),
      HODGEFORM_EMAIL_CAPTURE_FILE: capture, BETTER_AUTH_URL: base,
      BETTER_AUTH_SECRET: "local-preview-fixture-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
    }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => { if (output.length < 12000) output += data; });
  child.stderr.on("data", (data) => { if (output.length < 12000) output += data; });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, `preview exited: ${output}`);
    try {
      const response = await fetch(`${base}/api/ready`, { signal: AbortSignal.timeout(30000) });
      if (response.ok) return;
    } catch { /* The server may still be starting and initializing PGlite. */ }
    await sleep(200);
  }
  throw new Error(`Embedded preview never became ready: ${output}`);
}

try {
  for (const signups of [false, true]) {
    await start(signups);
    const login = await fetch(`${base}/login`);
    assert.equal(login.status, 200);
    const html = await login.text();
    assert.equal(html.includes("Create account"), signups, "signup UI must match runtime policy");
    if (!signups) assert.match(html, /Access is by invitation/);
    const result = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST", headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify({ name: "Preview fixture", email: "preview@example.test", password: "Preview-fixture-only-123!" }),
    });
    if (signups) {
      assert.equal(result.ok, true, `embedded signup failed (${result.status}): ${await result.text()}`);
      let delivered = false;
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline && !delivered) {
        try {
          const emails = (await readFile(capture, "utf8")).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
          delivered = emails.some((mail) => mail.subject === "Verify your HodgeForm account");
        } catch { /* Queued delivery may still be creating or writing the file. */ }
        if (!delivered) await sleep(100);
      }
      assert.ok(delivered, "verification email must reach the local capture");
    } else {
      assert.ok([400,403].includes(result.status), `closed signup returned ${result.status}`);
    }
    await stop();
  }
  console.log("built embedded preview and runtime signup policy: PASS");
} finally {
  await stop();
  // Only remove the exact temporary directory created above.
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  await rm(directory, { recursive: true, force: true });
}
