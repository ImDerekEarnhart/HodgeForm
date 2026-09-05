import { randomBytes, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { sha256 } from "./crypto.server";
import { tenantForUser, userCanAccessTenant } from "./tenant.server";
import { assertPublicReleaseReady } from "./config.server";
import { requireVerifierAdmin } from "./verifiers.server";
import type { ApiScope } from "./types";

export const ALL_API_SCOPES: ApiScope[] = [
  "repository:read",
  "repository:write",
  "candidate:read",
  "candidate:write",
  "evidence:write",
  "receipt:read",
];

function parseScopes(value: unknown): ApiScope[] {
  let values: unknown[] = [];
  if (Array.isArray(value)) values = value;
  else if (typeof value === "string") { try { const p = JSON.parse(value); if (Array.isArray(p)) values = p; } catch { values = []; } }
  const allowed = new Set(ALL_API_SCOPES);
  return [...new Set(values.map(String).filter((v): v is ApiScope => allowed.has(v as ApiScope)))];
}

export async function createApiToken(userId: string, name: string, options: { verifierPrincipalId?: string; scopes?: ApiScope[] } = {}) {
  assertPublicReleaseReady();
  const tenant = await tenantForUser(userId); const sql = await getSql();
  const scopes = options.scopes?.length ? [...new Set(options.scopes)].filter((s) => ALL_API_SCOPES.includes(s)) : [...ALL_API_SCOPES];
  if (!scopes.length) throw new Error("API token requires at least one scope");
  let verifierPrincipalId: string | null = null;
  if (options.verifierPrincipalId) {
    await requireVerifierAdmin(sql, userId, tenant);
    // Resolve with a representative machine evidence kind only to guarantee the principal exists.
    const [row] = await sql.query<{ id: string }>(
      `select id from verifier_principals where tenant_id=$1 and id=$2 and disabled_at is null`, [tenant, options.verifierPrincipalId],
    );
    if (!row) throw new Error("Verifier principal not found or disabled");
    verifierPrincipalId = row.id;
  }
  const secret = `hf_live_${randomBytes(32).toString("base64url")}`; const hash = sha256(secret); const prefix = secret.slice(0, 16);
  const id = `token_${randomUUID().replaceAll("-", "")}`;
  await sql.query(
    `insert into api_tokens(id,tenant_id,user_id,name,token_hash,token_prefix,verifier_principal_id,scopes_json)
     values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [id, tenant, userId, name.trim().slice(0, 80) || "CI token", hash, prefix, verifierPrincipalId, JSON.stringify(scopes)],
  );
  return { id, token: secret, prefix, name: name.trim().slice(0, 80) || "CI token", verifierPrincipalId, scopes };
}

export async function listApiTokens(userId: string) {
  const tenant = await tenantForUser(userId); const sql = await getSql();
  const rows = await sql.query<{ id: string; name: string; token_prefix: string; created_at: string; last_used_at: string | null; verifier_principal_id: string | null; scopes_json: unknown; verifier_name: string | null }>(
    `select t.id,t.name,t.token_prefix,t.created_at,t.last_used_at,t.verifier_principal_id,t.scopes_json,v.name as verifier_name
     from api_tokens t left join verifier_principals v on v.id=t.verifier_principal_id and v.tenant_id=t.tenant_id
     where t.tenant_id=$1 and t.user_id=$2 and t.revoked_at is null order by t.created_at desc`, [tenant, userId],
  );
  return rows.map(({ scopes_json, ...row }) => ({ ...row, scopes: parseScopes(scopes_json) }));
}

export async function revokeApiToken(userId: string, tokenId: string) {
  const tenant = await tenantForUser(userId); const sql = await getSql();
  await sql.query("update api_tokens set revoked_at=now() where tenant_id=$1 and user_id=$2 and id=$3 and revoked_at is null", [tenant, userId, tokenId]);
  return { ok: true };
}

export async function authenticateApiRequest(request: Request) {
  const header = request.headers.get("authorization") ?? ""; const match = /^Bearer\s+(hf_live_[A-Za-z0-9_-]+)$/.exec(header);
  if (!match) return null;
  const sql = await getSql(); const hash = sha256(match[1]);
  const [row] = await sql.query<{ id: string; tenant_id: string; user_id: string; verifier_principal_id: string | null; scopes_json: unknown }>(
    `select t.id,t.tenant_id,t.user_id,t.verifier_principal_id,t.scopes_json
     from api_tokens t left join verifier_principals v on v.id=t.verifier_principal_id and v.tenant_id=t.tenant_id
     where t.token_hash=$1 and t.revoked_at is null and (t.verifier_principal_id is null or v.disabled_at is null)`, [hash],
  );
  if (!row) return null;
  if (!(await userCanAccessTenant(row.user_id, row.tenant_id))) return null;
  const scopes = parseScopes(row.scopes_json);
  await sql.query("update api_tokens set last_used_at=now() where id=$1", [row.id]);
  return { userId: row.user_id, tenantId: row.tenant_id, tokenId: row.id, verifierPrincipalId: row.verifier_principal_id, scopes };
}

export function requireApiScope(auth: { scopes: ApiScope[] }, scope: ApiScope) {
  if (!auth.scopes.includes(scope)) throw new Error(`API token is missing required scope: ${scope}`);
}
