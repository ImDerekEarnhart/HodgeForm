import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { createApiToken, disableVerifierPrincipal, listApiTokens, listVerifierPrincipals, registerVerifierPrincipal, revokeApiToken } from "@/lib/gate/api";
import { useAsync } from "@/lib/use-async";
import { Card, CardHeader } from "./page";
import { Button } from "./ui/button";
import { Input, Select } from "./ui/input";

const SCOPE_PROFILES = {
  ci: ["repository:read","repository:write","candidate:read","candidate:write","evidence:write","receipt:read"],
  verifier: ["candidate:read","evidence:write","receipt:read"],
  read: ["repository:read","candidate:read","receipt:read"],
} as const;

export function DeveloperAccess() {
  const tokens=useAsync(()=>listApiTokens());
  const verifiers=useAsync(()=>listVerifierPrincipals());
  const [name,setName]=useState("GitHub Actions");
  const [secret,setSecret]=useState("");
  const [profile,setProfile]=useState<keyof typeof SCOPE_PROFILES>("ci");
  const [verifierId,setVerifierId]=useState("");
  const [verifierName,setVerifierName]=useState("Independent release verifier");
  const [verifierTrust,setVerifierTrust]=useState<"same_team"|"independent">("independent");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{ if(verifierId&&profile==="ci") setProfile("verifier"); },[verifierId,profile]);

  async function create(){setBusy(true);setError("");try{const r=await createApiToken({data:{name,verifierPrincipalId:verifierId||undefined,scopes:[...SCOPE_PROFILES[profile]] as any}});setSecret(r.token);await tokens.reload();}catch(e){setError(e instanceof Error?e.message:"Failed");}finally{setBusy(false);}}
  async function revoke(id:string){setError("");try{await revokeApiToken({data:{tokenId:id}});await tokens.reload();}catch(e){setError(e instanceof Error?e.message:"Failed");}}
  async function registerVerifier(){setBusy(true);setError("");try{await registerVerifierPrincipal({data:{name:verifierName,trustLevel:verifierTrust,allowedEvidenceKinds:["deterministic_test","sandbox_run","static_analysis",...(verifierTrust==="independent"?["independent_verifier" as const]:[])]}});setVerifierName("");await verifiers.reload();}catch(e){setError(e instanceof Error?e.message:"Failed to register verifier");}finally{setBusy(false);}}
  async function disableVerifier(id:string){setError("");try{await disableVerifierPrincipal({data:{verifierId:id}});if(verifierId===id)setVerifierId("");await verifiers.reload();await tokens.reload();}catch(e){setError(e instanceof Error?e.message:"Failed to disable verifier");}}

  return <div className="grid gap-6 xl:grid-cols-2">
    <Card><CardHeader title="Verifier registry" meta={<ShieldCheck className="size-4 text-subtle"/>}><p className="mt-1 text-xs text-muted">Independence is an authenticated property of a registered verifier principal—not a label an evidence submitter may self-assert.</p></CardHeader><div className="space-y-4 p-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]"><Input value={verifierName} onChange={e=>setVerifierName(e.target.value)} placeholder="Verifier name"/><Select value={verifierTrust} onChange={e=>setVerifierTrust(e.target.value as any)}><option value="independent">Independent</option><option value="same_team">Same team</option></Select><Button variant="secondary" onClick={()=>void registerVerifier()} disabled={busy||!verifierName.trim()}><Plus className="size-3"/>Register</Button></div>
      <div className="divide-y divide-border rounded-lg border border-border">{verifiers.data?.filter((v:any)=>!v.disabledAt).length?verifiers.data.filter((v:any)=>!v.disabledAt).map((v:any)=><div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2"><div className="min-w-0"><div className="truncate text-xs font-medium">{v.name}</div><div className="font-mono text-[10px] text-subtle">{v.trustLevel} · {v.allowedEvidenceKinds.join(", ")}</div></div><button onClick={()=>void disableVerifier(v.id)} className="text-subtle hover:text-red-300" aria-label="Disable verifier"><Trash2 className="size-3"/></button></div>):<div className="p-3 text-xs text-muted">No verifier principals registered yet.</div>}</div>
      <p className="text-[11px] leading-5 text-subtle">Disabling a verifier also revokes every API token bound to it. Existing evidence remains append-only and retains its original verifier identity.</p>
    </div></Card>

    <Card><CardHeader title="Developer access" meta={<KeyRound className="size-4 text-subtle"/>}><p className="mt-1 text-xs text-muted">Machine tokens are scope-limited. There is deliberately no API scope for human release approval.</p></CardHeader><div className="space-y-4 p-4">
      <div className="grid gap-2 sm:grid-cols-2"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Token name"/><Select value={profile} onChange={e=>setProfile(e.target.value as any)}><option value="ci">Standard CI</option><option value="verifier">Verifier-only</option><option value="read">Read-only</option></Select><Select value={verifierId} onChange={e=>setVerifierId(e.target.value)}><option value="">No verifier identity</option>{verifiers.data?.filter((v:any)=>!v.disabledAt).map((v:any)=><option key={v.id} value={v.id}>{v.name} · {v.trustLevel}</option>)}</Select><Button variant="secondary" onClick={()=>void create()} disabled={busy}><Plus className="size-3"/>Create token</Button></div>
      {secret&&<div className="rounded-lg border border-amber-800/40 bg-amber-500/5 p-3"><div className="text-xs font-medium text-amber-200">Copy this token now. It will not be shown again.</div><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded bg-bg p-2 font-mono text-[11px] text-fg">{secret}</code><Button size="sm" variant="secondary" onClick={()=>void navigator.clipboard.writeText(secret)}><Copy className="size-3"/>Copy</Button></div></div>}
      {error&&<p className="text-xs text-red-300">{error}</p>}
      <div className="divide-y divide-border rounded-lg border border-border">{tokens.data?.length?tokens.data.map((t:any)=><div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2"><div className="min-w-0"><div className="text-xs font-medium">{t.name}</div><div className="font-mono text-[10px] text-subtle">{t.token_prefix}…{t.verifier_name?` · ${t.verifier_name}`:""}</div><div className="mt-1 text-[10px] text-subtle">{t.scopes?.join(" · ")}</div></div><button onClick={()=>void revoke(t.id)} className="text-subtle hover:text-red-300" aria-label="Revoke token"><Trash2 className="size-3"/></button></div>):<div className="p-3 text-xs text-muted">No API tokens.</div>}</div>
      <code className="block whitespace-pre-wrap rounded-lg border border-border bg-bg p-3 font-mono text-[10px] leading-5 text-muted">{`export HODGEFORM_URL=https://your-host\nexport HODGEFORM_TOKEN=hf_live_…\nhodgeform candidate submit\nhodgeform evidence record cand_… --requirement HF-REG-001 --kind deterministic_test --outcome pass --source github-actions`}</code>
    </div></Card>
  </div>;
}
