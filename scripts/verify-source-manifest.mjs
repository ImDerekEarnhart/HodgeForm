#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestPath = "SOURCE_MANIFEST.sha256";
const manifestText = await readFile(manifestPath, "utf8");
const entries = new Map();

for (const line of manifestText.split(/\r?\n/)) {
  if (!line) continue;
  const match = /^([a-f0-9]{64})  \.\/(.+)$/.exec(line);
  if (!match) throw new Error(`Malformed ${manifestPath} entry: ${line}`);
  const [, hash, file] = match;
  if (entries.has(file)) throw new Error(`Duplicate ${manifestPath} entry: ${file}`);
  entries.set(file, hash);
}

const tracked = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => file !== manifestPath)
  .sort();

const missing = tracked.filter((file) => !entries.has(file));
const unexpected = [...entries.keys()].filter((file) => !tracked.includes(file));
if (missing.length || unexpected.length) {
  throw new Error(
    `${manifestPath} does not match the tracked source set: ${JSON.stringify({ missing, unexpected })}`,
  );
}

for (const file of tracked) {
  const content = execFileSync("git", ["show", `HEAD:${file}`], {
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
  });
  const actual = createHash("sha256").update(content).digest("hex");
  if (actual !== entries.get(file)) {
    throw new Error(`${manifestPath} hash mismatch for ${file}`);
  }
}

console.log(JSON.stringify({ status: "PASS", manifest: manifestPath, files: tracked.length, ref: "HEAD" }));
