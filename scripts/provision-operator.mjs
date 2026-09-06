#!/usr/bin/env node
import { hashPassword } from "better-auth/crypto";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const idempotent = process.argv.includes("--idempotent");
const positional = process.argv.slice(2).filter((argument) => argument !== "--idempotent");
const email = positional[0]?.trim().toLowerCase();
const name = positional[1]?.trim() || "HodgeForm operator";
const password = process.env.HODGEFORM_OPERATOR_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error("usage: npm run operator:provision -- <email> [name]");
}
if (!password || password.length < 12 || password.length > 128) {
  throw new Error("HODGEFORM_OPERATOR_PASSWORD must contain 12-128 characters");
}
if (process.env.HODGEFORM_OPERATOR_CONFIRM !== `PROVISION_OPERATOR:${email}`) {
  throw new Error(`HODGEFORM_OPERATOR_CONFIRM must exactly equal PROVISION_OPERATOR:${email}`);
}

const userId = `user_${randomUUID().replaceAll("-", "")}`;
const accountId = `account_${randomUUID().replaceAll("-", "")}`;
const workspaceId = `ws_${randomUUID().replaceAll("-", "")}`;
const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "operator";
const workspaceSlug = `${slugBase}-${randomBytes(4).toString("hex")}`;
const passwordHash = await hashPassword(password);
const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(`select id from "user" where lower(email)=lower($1) for update`, [email]);
    if (existing.rowCount) {
      if (!idempotent) throw new Error("An account with this email already exists; use the normal password-reset or owner-recovery procedure");
      await client.query("COMMIT");
      console.log(JSON.stringify({ status: "operator_already_provisioned", email }));
    } else {
      await client.query(
      `insert into "user"("id","name","email","emailVerified","createdAt","updatedAt") values($1,$2,$3,true,now(),now())`,
      [userId, name.slice(0, 120), email],
      );
      await client.query(
      `insert into "account"("id","accountId","providerId","userId","password","createdAt","updatedAt") values($1,$2,'credential',$3,$4,now(),now())`,
      [accountId, userId, userId, passwordHash],
      );
      if ((process.env.HODGEFORM_DEPLOYMENT_MODE ?? "saas").trim().toLowerCase() === "saas") {
      await client.query(`insert into workspaces(id,slug,name,created_by) values($1,$2,$3,$4)`, [workspaceId, workspaceSlug, `${name.slice(0, 90)} workspace`, userId]);
      await client.query(`insert into workspace_members(workspace_id,user_id,role) values($1,$2,'owner')`, [workspaceId, userId]);
      await client.query(`insert into user_workspace_preferences(user_id,workspace_id) values($1,$2)`, [userId, workspaceId]);
      }
      await client.query("COMMIT");
      console.log(JSON.stringify({ status: "operator_provisioned", email, userId, workspaceId: (process.env.HODGEFORM_DEPLOYMENT_MODE ?? "saas").toLowerCase() === "saas" ? workspaceId : null }));
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
