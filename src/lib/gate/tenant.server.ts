import { randomBytes, randomUUID } from "node:crypto";
import { getSql, withTransaction } from "@/lib/db";
import { sha256 } from "./crypto.server";
import { queueAuthEmail, publicEmailConfigured } from "@/lib/auth/email.server";
import { canRemoveOrDemoteOwner, roleCanApproveRisk, type WorkspaceRole } from "./authorization";

function mode() { return (process.env.HODGEFORM_DEPLOYMENT_MODE ?? (process.env.NODE_ENV === "production" ? "saas" : "private")).trim().toLowerCase(); }
function workspaceTenant(workspaceId:string){return `workspace:${workspaceId}`;}
function workspaceIdFromTenant(tenant:string){return tenant.startsWith("workspace:")?tenant.slice("workspace:".length):null;}

export async function tenantForUser(userId: string): Promise<string> {
  if (mode() === "private") {
    const configured = process.env.HODGEFORM_PRIVATE_TENANT_ID?.trim();
    if (!configured && (process.env.NODE_ENV === "production" || process.env.HODGEFORM_PUBLIC_RELEASE === "true")) throw new Error("HODGEFORM_PRIVATE_TENANT_ID is required in private public-release mode");
    return configured || "private-dev";
  }
  if (mode() !== "saas") throw new Error("HODGEFORM_DEPLOYMENT_MODE must be saas or private");
  return withTransaction(async(sql)=>{
    const [preferred]=await sql.query<{workspace_id:string}>(`select p.workspace_id from user_workspace_preferences p join workspace_members m on m.workspace_id=p.workspace_id and m.user_id=p.user_id where p.user_id=$1`,[userId]);
    if(preferred) return workspaceTenant(preferred.workspace_id);
    const [existing]=await sql.query<{workspace_id:string}>(`select workspace_id from workspace_members where user_id=$1 order by created_at asc limit 1`,[userId]);
    if(existing){await sql.query(`insert into user_workspace_preferences(user_id,workspace_id) values($1,$2) on conflict(user_id) do update set workspace_id=excluded.workspace_id,updated_at=now()`,[userId,existing.workspace_id]);return workspaceTenant(existing.workspace_id);}
    const workspaceId=`ws_${randomUUID().replaceAll("-","")}`;
    const suffix=randomBytes(4).toString("hex");
    const [u]=await sql.query<{name:string;email:string}>(`select name,email from "user" where id=$1`,[userId]);
    const base=(u?.name||u?.email?.split("@")[0]||"workspace").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"workspace";
    await sql.query(`insert into workspaces(id,slug,name,created_by) values($1,$2,$3,$4)`,[workspaceId,`${base}-${suffix}`,`${u?.name||"My"} workspace`,userId]);
    await sql.query(`insert into workspace_members(workspace_id,user_id,role) values($1,$2,'owner')`,[workspaceId,userId]);
    await sql.query(`insert into user_workspace_preferences(user_id,workspace_id) values($1,$2)`,[userId,workspaceId]);
    return workspaceTenant(workspaceId);
  });
}

export async function userCanAccessTenant(userId:string,tenant:string){
  if(mode()==="private") return tenant===await tenantForUser(userId);
  const workspaceId=workspaceIdFromTenant(tenant); if(!workspaceId)return false;
  const sql=await getSql();return (await sql.query(`select 1 from workspace_members where workspace_id=$1 and user_id=$2`,[workspaceId,userId])).length>0;
}

export async function listWorkspaces(userId:string){
  if(mode()==="private") return [{id:process.env.HODGEFORM_PRIVATE_TENANT_ID||"private-dev",name:"Private deployment",slug:"private",role:"owner",active:true}];
  const active=(await tenantForUser(userId)).slice("workspace:".length);const sql=await getSql();
  return (await sql.query<{id:string;name:string;slug:string;role:string}>(`select w.id,w.name,w.slug,m.role from workspace_members m join workspaces w on w.id=m.workspace_id where m.user_id=$1 order by w.created_at asc`,[userId])).map(w=>({...w,active:w.id===active}));
}

export async function createWorkspaceForUser(userId:string,name:string){
  if(mode()!=="saas")throw new Error("Private deployments use one fixed workspace");
  const clean=name.trim().slice(0,100);if(!clean)throw new Error("Workspace name is required");
  return withTransaction(async(sql)=>{const id=`ws_${randomUUID().replaceAll("-","")}`,slug=`${clean.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"workspace"}-${randomBytes(4).toString("hex")}`;await sql.query(`insert into workspaces(id,slug,name,created_by) values($1,$2,$3,$4)`,[id,slug,clean,userId]);await sql.query(`insert into workspace_members(workspace_id,user_id,role) values($1,$2,'owner')`,[id,userId]);await sql.query(`insert into user_workspace_preferences(user_id,workspace_id) values($1,$2) on conflict(user_id) do update set workspace_id=excluded.workspace_id,updated_at=now()`,[userId,id]);return{id,slug,name:clean};});
}

export async function switchWorkspace(userId:string,workspaceId:string){
  if(mode()!=="saas")return{ok:true};const sql=await getSql();const member=await sql.query(`select 1 from workspace_members where workspace_id=$1 and user_id=$2`,[workspaceId,userId]);if(!member.length)throw new Error("Workspace not found");await sql.query(`insert into user_workspace_preferences(user_id,workspace_id) values($1,$2) on conflict(user_id) do update set workspace_id=excluded.workspace_id,updated_at=now()`,[userId,workspaceId]);return{ok:true};
}

export async function listWorkspaceMembers(userId:string){
  const tenant=await tenantForUser(userId);if(!tenant.startsWith("workspace:"))return[];const wid=workspaceIdFromTenant(tenant)!;const sql=await getSql();return sql.query<{user_id:string;role:string;name:string;email:string;created_at:string}>(`select m.user_id,m.role,u.name,u.email,m.created_at from workspace_members m join "user" u on u.id=m.user_id where m.workspace_id=$1 order by m.created_at`,[wid]);
}

export async function inviteWorkspaceMember(userId:string,email:string,role:"admin"|"member"="member"){
  const tenant=await tenantForUser(userId);if(!tenant.startsWith("workspace:"))throw new Error("Invites are managed outside HodgeForm in private deployment mode");const wid=workspaceIdFromTenant(tenant)!;const sql=await getSql();const [me]=await sql.query<{role:string}>(`select role from workspace_members where workspace_id=$1 and user_id=$2`,[wid,userId]);if(!me||!['owner','admin'].includes(me.role))throw new Error("Only workspace owners/admins may invite members");const normalized=email.trim().toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized))throw new Error("Valid email is required");const token=randomBytes(32).toString("base64url"),tokenHash=sha256(token),id=`invite_${randomUUID().replaceAll("-","")}`;await sql.query(`insert into workspace_invites(id,workspace_id,email,role,token_hash,invited_by,expires_at) values($1,$2,$3,$4,$5,$6,now()+interval '7 days')`,[id,wid,normalized,role,tokenHash,userId]);const base=(process.env.BETTER_AUTH_URL??"http://localhost:8080").replace(/\/$/,"");const url=`${base}/accept-invite?token=${encodeURIComponent(token)}`;if(publicEmailConfigured())queueAuthEmail({to:normalized,subject:"You've been invited to HodgeForm",text:`Accept your HodgeForm workspace invitation: ${url}`});return{id,email:normalized,role,url,expiresInDays:7};
}

export async function acceptWorkspaceInvite(userId:string,token:string){
  const tokenHash=sha256(token.trim());return withTransaction(async(sql)=>{const [invite]=await sql.query<{id:string;workspace_id:string;email:string;role:"admin"|"member";accepted_at:string|null;expires_at:string}>(`select * from workspace_invites where token_hash=$1 for update`,[tokenHash]);if(!invite||invite.accepted_at||new Date(invite.expires_at).getTime()<Date.now())throw new Error("Invitation is invalid or expired");const [u]=await sql.query<{email:string}>(`select email from "user" where id=$1`,[userId]);if(!u||u.email.toLowerCase()!==invite.email.toLowerCase())throw new Error("Sign in with the email address that was invited");await sql.query(`insert into workspace_members(workspace_id,user_id,role) values($1,$2,$3) on conflict(workspace_id,user_id) do nothing`,[invite.workspace_id,userId,invite.role]);await sql.query(`update workspace_invites set accepted_at=now() where id=$1`,[invite.id]);await sql.query(`insert into user_workspace_preferences(user_id,workspace_id) values($1,$2) on conflict(user_id) do update set workspace_id=excluded.workspace_id,updated_at=now()`,[userId,invite.workspace_id]);return{ok:true,workspaceId:invite.workspace_id};});
}


async function requireWorkspaceOwner(sql: Awaited<ReturnType<typeof getSql>>, workspaceId: string, userId: string) {
  const [member] = await sql.query<{ role: WorkspaceRole }>(`select role from workspace_members where workspace_id=$1 and user_id=$2`, [workspaceId, userId]);
  if (!member || member.role !== "owner") throw new Error("Only workspace owners may manage member roles");
}

export async function setWorkspaceMemberRole(userId: string, targetUserId: string, role: WorkspaceRole) {
  if (mode() !== "saas") throw new Error("Private deployments manage operators outside HodgeForm");
  const tenant = await tenantForUser(userId); const workspaceId = workspaceIdFromTenant(tenant)!;
  return withTransaction(async (sql) => {
    await requireWorkspaceOwner(sql, workspaceId, userId);
    const [target] = await sql.query<{ role: WorkspaceRole }>(`select role from workspace_members where workspace_id=$1 and user_id=$2 for update`, [workspaceId, targetUserId]);
    if (!target) throw new Error("Workspace member not found");
    const [owners] = await sql.query<{ count: number }>(`select count(*)::bigint as count from workspace_members where workspace_id=$1 and role='owner'`, [workspaceId]);
    if (target.role === "owner" && role !== "owner" && !canRemoveOrDemoteOwner(target.role, Number(owners?.count ?? 0))) throw new Error("A workspace must retain at least one owner");
    await sql.query(`update workspace_members set role=$3 where workspace_id=$1 and user_id=$2`, [workspaceId, targetUserId, role]);
    return { ok: true };
  });
}

export async function removeWorkspaceMember(userId: string, targetUserId: string) {
  if (mode() !== "saas") throw new Error("Private deployments manage operators outside HodgeForm");
  const tenant = await tenantForUser(userId); const workspaceId = workspaceIdFromTenant(tenant)!;
  return withTransaction(async (sql) => {
    await requireWorkspaceOwner(sql, workspaceId, userId);
    const [target] = await sql.query<{ role: WorkspaceRole }>(`select role from workspace_members where workspace_id=$1 and user_id=$2 for update`, [workspaceId, targetUserId]);
    if (!target) throw new Error("Workspace member not found");
    const [owners] = await sql.query<{ count: number }>(`select count(*)::bigint as count from workspace_members where workspace_id=$1 and role='owner'`, [workspaceId]);
    if (!canRemoveOrDemoteOwner(target.role, Number(owners?.count ?? 0))) throw new Error("A workspace must retain at least one owner");
    await sql.query(`delete from workspace_members where workspace_id=$1 and user_id=$2`, [workspaceId, targetUserId]);
    await sql.query(`delete from user_workspace_preferences where user_id=$1 and workspace_id=$2`, [targetUserId, workspaceId]);
    return { ok: true };
  });
}

export async function requireReleaseAuthority(userId:string,tenant:string,risk:"low"|"medium"|"high"|"critical") {
  if(mode()==="private") { if(tenant!==await tenantForUser(userId)) throw new Error("Workspace access denied"); return; }
  const workspaceId=workspaceIdFromTenant(tenant); if(!workspaceId) throw new Error("Invalid workspace tenant");
  const sql=await getSql(); const [member]=await sql.query<{role:WorkspaceRole}>(`select role from workspace_members where workspace_id=$1 and user_id=$2`,[workspaceId,userId]);
  if(!member) throw new Error("Workspace access denied");
  if(!roleCanApproveRisk(member.role,risk)) throw new Error("High-risk releases require a workspace owner or admin approver");
}
