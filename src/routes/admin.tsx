import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, RefreshCw, Send, ShieldCheck, UserCheck, Users, Waypoints, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RequireUser } from "@/lib/auth/gates";
import { adminInviteMember, cancelAdminInvite, getAdminDashboard } from "@/lib/admin/api";
import { useAsync } from "@/lib/use-async";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardHeader, Empty, Page } from "@/components/page";

export const Route = createFileRoute("/admin")({ component: () => <RequireUser><AdminConsole /></RequireUser> });

const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "Never";

function AdminConsole() {
  const dashboard = useAsync(() => getAdminDashboard());
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");
  const dailyMax = useMemo(() => Math.max(1, ...(dashboard.data?.daily.map((day: any) => day.pageViews) ?? [1])), [dashboard.data]);

  async function invite() {
    setProblem(""); setNotice("");
    try {
      const result: any = await adminInviteMember({ data: { email, role } } as never);
      setNotice(`Invitation emailed to ${result.email}; it expires in ${result.expiresInDays} days.`);
      setEmail(""); await dashboard.reload();
    } catch (error) { setProblem(error instanceof Error ? error.message : "Unable to create invitation"); }
  }
  async function cancel(inviteId: string) {
    setProblem("");
    try { await cancelAdminInvite({ data: { inviteId } } as never); await dashboard.reload(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "Unable to cancel invitation"); }
  }

  const counts: any = dashboard.data?.counts ?? {};
  const stats = [
    ["Users", counts.users, Users], ["Verified", counts.verified_users, UserCheck], ["Active users", counts.active_users, Activity], ["New · 7 days", counts.new_users_7d, UserCheck],
    ["Workspaces", counts.workspaces, Waypoints], ["Candidates", counts.candidates, ShieldCheck], ["Released", counts.releases, ShieldCheck], ["Evidence", counts.evidence, Activity],
  ] as const;
  if (dashboard.error) return <Page eyebrow="Platform operations" title="Operator command center" description="Restricted to explicitly configured platform administrators."><div role="alert" className="rounded-xl border border-red-800/40 bg-red-500/10 p-5 text-sm text-red-200">{dashboard.error}</div></Page>;
  return <Page eyebrow="Platform operations" title="Operator command center" description="Platform health, privacy-preserving traffic, accounts, workspaces, invitations, and governed product activity." actions={<Button variant="secondary" onClick={() => void dashboard.reload()} disabled={dashboard.loading}><RefreshCw className="size-3"/>Refresh</Button>}>
    {problem && <div role="alert" className="mb-4 rounded-lg border border-red-800/40 bg-red-500/10 p-3 text-sm text-red-300">{problem}</div>}
    {notice && <div className="mb-4 rounded-lg border border-emerald-800/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon]) => <Card key={label} className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><Icon className="size-4 text-subtle"/></div><div className="mt-4 text-3xl font-semibold tabular-nums">{dashboard.loading ? "—" : String(value ?? 0)}</div></Card>)}</div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <Card><CardHeader title="Traffic and signups · 14 days" meta={<span className="font-mono text-[10px] uppercase text-subtle">No raw IP addresses stored</span>}/><div className="p-4"><div className="flex h-48 items-end gap-2" aria-label="Fourteen day visitor chart">{dashboard.data?.daily.map((day: any) => <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><div className="w-full rounded-t bg-accent/70" style={{height:`${Math.max(3,(day.pageViews/dailyMax)*150)}px`}} title={`${day.day}: ${day.pageViews} views, ${day.uniqueVisitors} visitors, ${day.signups} signups`}/><span className="hidden font-mono text-[8px] text-subtle sm:block">{day.day.slice(5)}</span></div>)}</div><div className="mt-3 flex flex-wrap gap-5 text-xs text-muted"><span>Views: {dashboard.data?.daily.reduce((sum: number, row: any) => sum + row.pageViews, 0) ?? 0}</span><span>Visitor-days: {dashboard.data?.daily.reduce((sum: number, row: any) => sum + row.uniqueVisitors, 0) ?? 0}</span><span>Signups: {dashboard.data?.daily.reduce((sum: number, row: any) => sum + row.signups, 0) ?? 0}</span></div></div></Card>
      <Card><CardHeader title="Production controls"/><div className="space-y-3 p-4 text-sm">{dashboard.data && Object.entries({"Release channel":dashboard.data.system.channel,"Configuration":dashboard.data.system.ready?"Ready":"Blocked","Transactional email":dashboard.data.system.emailConfigured?"Configured":"Missing","Receipt signer":dashboard.data.system.signerConfigured?"Configured":"Missing","Signup policy":dashboard.data.system.channel==="public_ga"?"Public GA":"Invitation only","Retention":`${dashboard.data.system.retentionDays} days`}).map(([label,value]) => <div key={label} className="flex justify-between gap-4 border-b border-border pb-2"><span className="text-muted">{label}</span><span className="text-right font-medium">{String(value)}</span></div>)}<Link to="/workspace" className="inline-flex text-xs text-accent hover:text-fg">Manage workspace roles →</Link></div></Card>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card><CardHeader title="Recent accounts" meta={<span className="text-xs text-subtle">Latest 20</span>}/>{dashboard.data?.recentUsers.length ? <div className="divide-y divide-border">{dashboard.data.recentUsers.map((user: any) => <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{user.name}</div><div className="truncate text-xs text-muted">{user.email}</div></div><div className="text-right text-xs text-muted"><div>{user.verified ? "Verified" : "Unverified"} · {user.workspace_count} workspace(s)</div><div className="mt-1">Joined {formatDate(user.created_at)}</div></div></div>)}</div> : <div className="p-4"><Empty title="No accounts" text="Accounts will appear here after they are provisioned or sign up."/></div>}</Card>
      <Card><CardHeader title="Recent workspaces" meta={<span className="text-xs text-subtle">{counts.repositories ?? 0} repositories</span>}/>{dashboard.data?.recentWorkspaces.length ? <div className="divide-y divide-border">{dashboard.data.recentWorkspaces.map((workspace: any) => <div key={workspace.id} className="flex items-center justify-between gap-4 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{workspace.name}</div><div className="truncate font-mono text-[10px] text-muted">{workspace.slug}</div></div><div className="text-right text-xs text-muted">{workspace.members} member(s)<br/>{workspace.candidates} candidate(s)</div></div>)}</div> : <div className="p-4"><Empty title="No workspaces" text="Workspace activity will appear here."/></div>}</Card>
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card><CardHeader title="Invite a beta user" meta={<Send className="size-4 text-subtle"/>}/><div className="grid gap-2 p-4 sm:grid-cols-[1fr_120px_auto]"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@company.com"/><Select value={role} onChange={(event) => setRole(event.target.value as "member"|"admin")}><option value="member">Member</option><option value="admin">Admin</option></Select><Button onClick={() => void invite()} disabled={!email.trim()}>Send invite</Button></div>{dashboard.data?.pendingInvites.length ? <div className="divide-y divide-border border-t border-border">{dashboard.data.pendingInvites.map((invite: any) => <div key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm">{invite.email}</div><div className="text-xs text-muted">{invite.workspace} · {invite.role} · expires {formatDate(invite.expires_at)}</div></div><Button variant="secondary" size="sm" onClick={() => void cancel(invite.id)} aria-label={`Cancel invitation for ${invite.email}`}><X className="size-3"/>Cancel</Button></div>)}</div> : null}</Card>
      <Card><CardHeader title="Administrator audit" meta={<span className="text-xs text-subtle">Latest 30</span>}/>{dashboard.data?.auditEvents.length ? <div className="divide-y divide-border">{dashboard.data.auditEvents.map((event: any) => <div key={event.id} className="px-4 py-3"><div className="text-sm font-medium">{event.action}</div><div className="mt-1 text-xs text-muted">{event.actor_email} · {event.target_type} · {formatDate(event.created_at)}</div></div>)}</div> : <div className="p-4"><Empty title="No administrative changes" text="Invitation and control actions will be recorded here."/></div>}</Card>
    </div>
  </Page>;
}
