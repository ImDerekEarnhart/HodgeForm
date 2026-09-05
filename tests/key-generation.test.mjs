import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const cli = fileURLToPath(new URL("../bin/hodgeform.mjs", import.meta.url));

test("key generation never prints private material or replaces an existing authority", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hf-key-test-"));
  try {
    const first = spawnSync(process.execPath, [cli, "keys", "generate", "--out-dir", directory], { encoding: "utf8" });
    assert.equal(first.status, 0);
    const privateKey = await readFile(join(directory, "hodgeform-private.pem"), "utf8");
    const publicKey = await readFile(join(directory, "hodgeform.pub"), "utf8");
    assert.equal(first.stdout.includes(privateKey.trim()), false);
    assert.equal(first.stdout.includes(Buffer.from(privateKey).toString("base64")), false);
    assert.equal(first.stderr.includes(privateKey.trim()), false);
    assert.match(first.stdout, /fingerprint: [a-f0-9]{64}/);
    const second = spawnSync(process.execPath, [cli, "keys", "generate", "--out-dir", directory], { encoding: "utf8" });
    assert.notEqual(second.status, 0);
    assert.equal(await readFile(join(directory, "hodgeform-private.pem"), "utf8"), privateKey);
    assert.equal(await readFile(join(directory, "hodgeform.pub"), "utf8"), publicKey);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
