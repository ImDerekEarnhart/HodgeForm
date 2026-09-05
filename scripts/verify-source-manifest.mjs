#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const manifestPath = "SOURCE_MANIFEST.sha256";
const args = process.argv.slice(2);
const write = args.includes("--write");
const refIndex = args.indexOf("--ref");
if (refIndex !== -1 && !args[refIndex + 1]) throw new Error("--ref requires a Git tree-ish");
if (args.some((arg, index) => !["--write", "--ref"].includes(arg) && args[index - 1] !== "--ref")) {
  throw new Error("Usage: verify-source-manifest.mjs [--write] [--ref <tree-ish>]");
}
const ref = refIndex === -1 ? "HEAD" : args[refIndex + 1];

const tracked = execFileSync("git", ["ls-tree", "-r", "--name-only", ref], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => file !== manifestPath)
  .sort();

const hashes = new Map();
for (const file of tracked) {
  const content = execFileSync("git", ["show", `${ref}:${file}`], {
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
  });
  hashes.set(file, createHash("sha256").update(content).digest("hex"));
}

if (write) {
  const output = tracked.map((file) => `${hashes.get(file)}  ./${file}`).join("\n") + "\n";
  await writeFile(manifestPath, output, "utf8");
  console.log(JSON.stringify({ status: "WROTE", manifest: manifestPath, files: tracked.length, ref }));
  process.exit(0);
}

const manifestText = await readFile(manifestPath, "utf8");
const entries = new Map();
for (const line of manifestText.split(/\r?\n/)) {
  if (!line) continue;
  const match = /^([a-f0-9]{64}) {2}\.\/(.+)$/.exec(line);
  if (!match) throw new Error(`Malformed ${manifestPath} entry: ${line}`);
  const [, hash, file] = match;
  if (entries.has(file)) throw new Error(`Duplicate ${manifestPath} entry: ${file}`);
  entries.set(file, hash);
}

const missing = tracked.filter((file) => !entries.has(file));
const unexpected = [...entries.keys()].filter((file) => !tracked.includes(file));
if (missing.length || unexpected.length) {
  throw new Error(
    `${manifestPath} does not match the tracked source set: ${JSON.stringify({ missing, unexpected })}`,
  );
}

for (const file of tracked) {
  const actual = hashes.get(file);
  if (actual !== entries.get(file)) {
    throw new Error(`${manifestPath} hash mismatch for ${file}`);
  }
}

console.log(JSON.stringify({ status: "PASS", manifest: manifestPath, files: tracked.length, ref }));
