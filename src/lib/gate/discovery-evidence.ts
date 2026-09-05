import type { Sql } from "../db";

/** Evidence cited by a discovery must belong to the same tenant and repository. */
export async function validateDiscoveryEvidence(sql: Sql, tenantId: string, repositoryId: string, references: string[]): Promise<string[]> {
  if (references.length > 100 || new Set(references).size !== references.length) {
    throw new Error("Discovery evidence references must be unique and contain at most 100 entries");
  }
  if (!references.length) return [];
  const found = await sql.query<{ id: string }>(
    `select e.id from evidence_receipts e
     join release_candidates c on c.id=e.candidate_id and c.tenant_id=e.tenant_id
     where e.tenant_id=$1 and c.repository_id=$2 and e.id=any($3::text[])`,
    [tenantId, repositoryId, references],
  );
  if (found.length !== references.length) throw new Error("Discovery evidence must exist in this workspace and repository");
  return [...references];
}
