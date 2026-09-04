import { randomUUID } from "node:crypto";
import { getSql, type Sql } from "@/lib/db";
import { tenantForUser } from "./tenant.server";
import type { EvidenceKind, VerifierPrincipal, VerifierTrust } from "./types";

const MACHINE_EVIDENCE_KINDS = new Set<EvidenceKind>([
  "deterministic_test",
  "sandbox_run",
  "static_analysis",
  "llm_evaluation",
  "independent_verifier",
]);

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function workspaceIdFromTenant(tenant: string) {
  return tenant.startsWith("workspace:") ? tenant.slice("workspace:".length) : null;
}

export async function requireVerifierAdmin(sql: Sql, userId: string, tenant: string) {
  const workspaceId = workspaceIdFromTenant(tenant);
  if (!workspaceId) return; // private deployment: authenticated deployment operators own the single tenant boundary
  const [member] = await sql.query<{ role: string }>(
    `select role from workspace_members where workspace_id=$1 and user_id=$2`, [workspaceId, userId],
  );
  if (!member || !["owner", "admin"].includes(member.role)) throw new Error("Only workspace owners/admins may manage verifier principals");
}

function rowToPrincipal(row: { id: string; tenant_id: string; name: string; trust_level: VerifierTrust; allowed_evidence_kinds_json: unknown; disabled_at?: string | null }): VerifierPrincipal {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    trustLevel: row.trust_level,
    allowedEvidenceKinds: asArray(row.allowed_evidence_kinds_json).map(String).filter((v): v is EvidenceKind => MACHINE_EVIDENCE_KINDS.has(v as EvidenceKind)),
    disabledAt: row.disabled_at ?? null,
  };
}

export async function listVerifierPrincipals(userId: string) {
  const tenant = await tenantForUser(userId); const sql = await getSql();
  const rows = await sql.query<{ id: string; tenant_id: string; name: string; trust_level: VerifierTrust; allowed_evidence_kinds_json: unknown; disabled_at: string | null; created_at: string }>(
    `select id,tenant_id,name,trust_level,allowed_evidence_kinds_json,disabled_at,created_at
     from verifier_principals where tenant_id=$1 order by disabled_at nulls first, created_at desc`, [tenant],
  );
  return rows.map((r) => ({ ...rowToPrincipal(r), createdAt: r.created_at }));
}

export async function registerVerifierPrincipal(userId: string, input: { name: string; trustLevel: VerifierTrust; allowedEvidenceKinds: EvidenceKind[] }) {
  const tenant = await tenantForUser(userId); const sql = await getSql(); await requireVerifierAdmin(sql, userId, tenant);
  const name = input.name.trim().slice(0, 100); if (!name) throw new Error("Verifier name is required");
  if (!["same_team", "independent"].includes(input.trustLevel)) throw new Error("Unsupported verifier trust level");
  const allowed = [...new Set(input.allowedEvidenceKinds)].filter((k) => MACHINE_EVIDENCE_KINDS.has(k));
  if (!allowed.length) throw new Error("Select at least one machine evidence kind");
  if (input.trustLevel === "independent" && !allowed.includes("independent_verifier")) allowed.push("independent_verifier");
  const principal = { id: `verifier_${randomUUID().replaceAll("-", "")}`, tenant, name, trustLevel: input.trustLevel, allowed };
  await sql.query(
    `insert into verifier_principals(id,tenant_id,name,trust_level,allowed_evidence_kinds_json,created_by)
     values($1,$2,$3,$4,$5::jsonb,$6)`,
    [principal.id, tenant, name, input.trustLevel, JSON.stringify(allowed), userId],
  );
  return { id: principal.id, name, trustLevel: principal.trustLevel, allowedEvidenceKinds: allowed };
}

export async function disableVerifierPrincipal(userId: string, verifierId: string) {
  const tenant = await tenantForUser(userId); const sql = await getSql(); await requireVerifierAdmin(sql, userId, tenant);
  const rows = await sql.query<{ id: string }>(
    `update verifier_principals set disabled_at=now() where tenant_id=$1 and id=$2 and disabled_at is null returning id`, [tenant, verifierId],
  );
  if (!rows.length) throw new Error("Verifier principal not found or already disabled");
  // Tokens stay append-only for audit but become unusable immediately.
  await sql.query(`update api_tokens set revoked_at=coalesce(revoked_at,now()) where tenant_id=$1 and verifier_principal_id=$2`, [tenant, verifierId]);
  return { ok: true };
}

export async function resolveVerifierPrincipal(sql: Sql, tenant: string, verifierId: string | null | undefined, evidenceKind: EvidenceKind) {
  if (!verifierId) return null;
  const [row] = await sql.query<{ id: string; tenant_id: string; name: string; trust_level: VerifierTrust; allowed_evidence_kinds_json: unknown; disabled_at: string | null }>(
    `select id,tenant_id,name,trust_level,allowed_evidence_kinds_json,disabled_at
     from verifier_principals where tenant_id=$1 and id=$2 and disabled_at is null`, [tenant, verifierId],
  );
  if (!row) throw new Error("Verifier principal is disabled or unavailable");
  const principal = rowToPrincipal(row);
  if (!principal.allowedEvidenceKinds.includes(evidenceKind)) throw new Error(`Verifier ${principal.name} is not registered for ${evidenceKind}`);
  return principal;
}
