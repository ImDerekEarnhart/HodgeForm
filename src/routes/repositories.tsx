import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { RequireUser } from "@/lib/auth/gates";
import { createRepository, listRepositories } from "@/lib/gate/api";
import { useAsync } from "@/lib/use-async";
import { Page, Card, CardHeader, Empty } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
export const Route = createFileRoute("/repositories")({ component: () => <RequireUser><Repositories /></RequireUser> });
function Repositories() {
  const { data, error, reload } = useAsync(() => listRepositories()); const [open,setOpen]=useState(false); const [name,setName]=useState(""); const [description,setDescription]=useState(""); const [busy,setBusy]=useState(false); const [formError,setFormError]=useState("");
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setFormError(""); try { await createRepository({ data: { name, description } }); setName(""); setDescription(""); setOpen(false); await reload(); } catch(e){ setFormError(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); } }
  return <Page eyebrow="Versioned AI work" title="Repositories" description="Private content-addressed histories for agents, release candidates, evidence, and discoveries." actions={<Button onClick={()=>setOpen(!open)}><Plus className="size-4" />New repository</Button>}>
    {(error||formError)&&<div className="mb-4 rounded-lg border border-red-800/40 bg-red-500/10 p-3 text-sm text-red-300">{formError||error}</div>}
    {open && <Card className="mb-6"><CardHeader title="Create repository"/><form onSubmit={submit} className="grid gap-3 p-4 md:grid-cols-2"><Input required value={name} onChange={e=>setName(e.target.value)} placeholder="Payments agent"/><Textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="What consequential AI work belongs here?" className="md:row-span-2"/><Button disabled={busy} className="w-fit">{busy?"Creating…":"Create"}</Button></form></Card>}
    {data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map((r:any)=><Card key={r.id} className="p-5"><div className="font-mono text-[10px] uppercase tracking-[.14em] text-subtle">{r.slug}</div><h2 className="mt-2 text-lg font-semibold">{r.name}</h2><p className="mt-2 min-h-10 text-sm text-muted">{r.description||"No description."}</p><div className="mt-5 flex gap-4 border-t border-border pt-3 text-xs text-muted"><span>{r.candidate_count} candidates</span><span>{r.discovery_count} discoveries</span></div></Card>)}</div> : <Empty title="Create your first repository" text="Repositories are the trust boundary and lineage root for every candidate, receipt, and discovery."/>}
  </Page>;
}
