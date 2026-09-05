#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { verifyPassword } from "better-auth/crypto";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const suffix = randomBytes(5).toString("hex");
const email = `provision-${suffix}@example.test`;
const password = `Provisioning-${suffix}-Password!`;
const env = {
  ...process.env,
  HODGEFORM_DEPLOYMENT_MODE: "saas",
  HODGEFORM_OPERATOR_PASSWORD: password,
  HODGEFORM_OPERATOR_CONFIRM: `PROVISION_OPERATOR:${email}`,
};
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const run = spawnSync(process.execPath, ["scripts/provision-operator.mjs", email, "Provisioning Smoke"], { env, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout.trim());
  assert.equal(result.status, "operator_provisioned");
  const user = await pool.query(`select id,"emailVerified" from "user" where email=$1`, [email]);
  assert.equal(user.rowCount, 1);
  assert.equal(user.rows[0].emailVerified, true);
  const account = await pool.query(`select password from "account" where "userId"=$1 and "providerId"='credential'`, [user.rows[0].id]);
  assert.equal(account.rowCount, 1);
  assert.equal(await verifyPassword({ hash: account.rows[0].password, password }), true);
  const owner = await pool.query(`select role from workspace_members where user_id=$1`, [user.rows[0].id]);
  assert.deepEqual(owner.rows.map((row) => row.role), ["owner"]);
  const duplicate = spawnSync(process.execPath, ["scripts/provision-operator.mjs", email, "Duplicate"], { env, encoding: "utf8" });
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /already exists/);
  console.log("operator provisioning smoke: PASS");
} finally {
  const user = await pool.query(`select id from "user" where email=$1`, [email]);
  if (user.rows[0]) {
    const workspaces = await pool.query(`select workspace_id from workspace_members where user_id=$1`, [user.rows[0].id]);
    for (const row of workspaces.rows) await pool.query(`delete from workspaces where id=$1`, [row.workspace_id]);
    await pool.query(`delete from "user" where id=$1`, [user.rows[0].id]);
  }
  await pool.end();
}
