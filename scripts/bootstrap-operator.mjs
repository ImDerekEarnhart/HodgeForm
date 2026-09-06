#!/usr/bin/env node
import { spawn } from "node:child_process";

const email = process.env.HODGEFORM_BOOTSTRAP_OPERATOR_EMAIL?.trim().toLowerCase();
const name = process.env.HODGEFORM_BOOTSTRAP_OPERATOR_NAME?.trim() || "HodgeForm operator";
const password = process.env.HODGEFORM_BOOTSTRAP_OPERATOR_PASSWORD;

if (!email) {
  console.log("[bootstrap-operator] not configured — skipping.");
  process.exit(0);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("HODGEFORM_BOOTSTRAP_OPERATOR_EMAIL must be a valid email address");
}
if (!password || password.length < 12 || password.length > 128) {
  throw new Error("HODGEFORM_BOOTSTRAP_OPERATOR_PASSWORD must contain 12-128 characters");
}

const result = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/provision-operator.mjs", email, name, "--idempotent"], {
    env: {
      ...process.env,
      HODGEFORM_OPERATOR_PASSWORD: password,
      HODGEFORM_OPERATOR_CONFIRM: `PROVISION_OPERATOR:${email}`,
    },
    stdio: "inherit",
  });
  child.once("error", reject);
  child.once("exit", (code, signal) => resolve({ code, signal }));
});
if (result.code !== 0) throw new Error(`operator provisioning exited with code ${result.code ?? "unknown"}${result.signal ? ` (${result.signal})` : ""}`);
