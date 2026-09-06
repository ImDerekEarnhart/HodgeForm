import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { publicEmailConfigured } from "@/lib/auth/email.server";
import { releaseKeyConfigured } from "@/lib/gate/crypto.server";
import { publicReleaseConfig } from "@/lib/gate/config.server";

const numberValue = (value: unknown) => Number(value ?? 0);

async function audit(userId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const sql = await getSql();
  await sql.query(`insert into platform_admin_audit(id,actor_user_id,action,target_type,target_id,metadata_json) values($1,$2,$3,$4,$5,$6::jsonb)`, [`admin_${randomUUID().replaceAll("-", "")}`, userId, action, targetType, targetId, JSON.stringify(metadata)]);
}

export async function getAdminDashboard(_userId: string) {
  const sql = await getSql();
  const [counts, traffic, visitors, signups, recentUsers, recentWorkspaces, pendingInvites, auditEvents] = await Promise.all([
    sql.query<Record<string, unknown>>(`select
      (select count(*) from "user") users,
      (select count(*) from "user" where "emailVerified"=true) verified_users,
      (select count(*) from "user" where "createdAt">=now()-interval '7 days') new_users_7d,
      (select count(distinct "userId") from "session" where "expiresAt">now()) active_users,
      (select count(*) from workspaces) workspaces,
      (select count(*) from workspace_invites where accepted_at is null and expires_at>now()) pending_invites,
      (select count(*) from repositories) repositories,
      (select count(*) from release_candidates) candidates,
      (select count(*) from release_receipts where verdict='RELEASE') releases,
      (select count(*) from release_receipts where verdict='BLOCK') blocks,
      (select count(*) from evidence_receipts) evidence,
      (select count(*) from discovery_commits) discoveries,
      (select count(*) from api_tokens where revoked_at is null) active_tokens`),
    sql.query<{ day: string; page_views: unknown }>(`select day,sum(page_views)::bigint page_views from platform_daily_traffic where day>=current_date-13 group by day order by day`),
    sql.query<{ day: string; unique_visitors: unknown }>(`select day,count(*)::bigint unique_visitors from platform_daily_visitors where day>=current_date-13 group by day order by day`),
    sql.query<{ day: string; signups: unknown }>(`select "createdAt"::date day,count(*)::bigint signups from "user" where "createdAt">=current_date-13 group by "createdAt"::date order by day`),
    sql.query<{ id: string; name: string; email: string; verified: boolean; created_at: string; last_seen: string | null; workspace_count: unknown }>(`select u.id,u.name,u.email,u."emailVerified" verified,u."createdAt" created_at,max(s."updatedAt") last_seen,count(distinct m.workspace_id)::bigint workspace_count from "user" u left join "session" s on s."userId"=u.id left join workspace_members m on m.user_id=u.id group by u.id order by u."createdAt" desc limit 20`),
    sql.query<{ id: string; name: string; slug: string; created_at: string; members: unknown; candidates: unknown }>(`select w.id,w.name,w.slug,w.created_at,count(distinct m.user_id)::bigint members,count(distinct c.id)::bigint candidates from workspaces w left join workspace_members m on m.workspace_id=w.id left join release_candidates c on c.tenant_id='workspace:'||w.id group by w.id order by w.created_at desc limit 20`),
    sql.query<{ id: string; email: string; role: string; workspace: string; expires_at: string; created_at: string }>(`select i.id,i.email,i.role,w.name workspace,i.expires_at,i.created_at from workspace_invites i join workspaces w on w.id=i.workspace_id where i.accepted_at is null and i.expires_at>now() order by i.created_at desc limit 20`),
    sql.query<{ id: string; action: string; target_type: string; target_id: string; created_at: string; actor_email: string }>(`select a.id,a.action,a.target_type,a.target_id,a.created_at,u.email actor_email from platform_admin_audit a join "user" u on u.id=a.actor_user_id order by a.created_at desc limit 30`),
  ]);
  const first = counts[0] ?? {};
  const byDay = new Map<string, { day: string; pageViews: number; uniqueVisitors: number; signups: number }>();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(); date.setUTCDate(date.getUTCDate() - offset);
    const day = date.toISOString().slice(0, 10); byDay.set(day, { day, pageViews: 0, uniqueVisitors: 0, signups: 0 });
  }
  for (const row of traffic) if (byDay.has(row.day)) byDay.get(row.day)!.pageViews = numberValue(row.page_views);
  for (const row of visitors) if (byDay.has(row.day)) byDay.get(row.day)!.uniqueVisitors = numberValue(row.unique_visitors);
  for (const row of signups) if (byDay.has(row.day)) byDay.get(row.day)!.signups = numberValue(row.signups);
  return {
    counts: Object.fromEntries(Object.entries(first).map(([key, value]) => [key, numberValue(value)])),
    daily: [...byDay.values()],
    recentUsers: recentUsers.map((row) => ({ ...row, workspace_count: numberValue(row.workspace_count) })),
    recentWorkspaces: recentWorkspaces.map((row) => ({ ...row, members: numberValue(row.members), candidates: numberValue(row.candidates) })),
    pendingInvites,
    auditEvents,
    system: { ...publicReleaseConfig(), emailConfigured: publicEmailConfigured(), signerConfigured: releaseKeyConfigured(), canonicalUrl: process.env.BETTER_AUTH_URL ?? "", retentionDays: numberValue(process.env.HODGEFORM_DATA_RETENTION_DAYS ?? 30) },
  };
}

export async function adminInvite(userId: string, email: string, role: "admin" | "member") {
  const { inviteWorkspaceMember } = await import("@/lib/gate/tenant.server");
  const result = await inviteWorkspaceMember(userId, email, role);
  await audit(userId, "workspace.invite_created", "workspace_invite", result.id, { email: result.email, role: result.role });
  return { id: result.id, email: result.email, role: result.role, expiresInDays: result.expiresInDays };
}

export async function cancelAdminInvite(userId: string, inviteId: string) {
  const sql = await getSql();
  const removed = await sql.query<{ id: string }>(`delete from workspace_invites where id=$1 and accepted_at is null returning id`, [inviteId]);
  if (!removed.length) throw new Error("Pending invitation not found");
  await audit(userId, "workspace.invite_cancelled", "workspace_invite", inviteId);
  return { ok: true };
}
