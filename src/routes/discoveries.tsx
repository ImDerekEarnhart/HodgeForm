import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { RequireUser } from "@/lib/auth/gates";
import { createDiscovery, listDiscoveries, listRepositories } from "@/lib/gate/api";
import { discoveryTemplates } from "@/lib/gate/discovery-templates";
import { useAsync } from "@/lib/use-async";
import { Page, Card, CardHeader, Empty } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Status, Hash } from "@/components/status";

export const Route = createFileRoute("/discoveries")({ component: () => <RequireUser><Discoveries /></RequireUser> });

function Discoveries() {
  const commits = useAsync(() => listDiscoveries());
  const repos = useAsync(() => listRepositories());
  const [open, setOpen] = useState(false);
  const [repo, setRepo] = useState("");
  const [parent, setParent] = useState("");
  const [branch, setBranch] = useState("main");
  const [title, setTitle] = useState("");
  const [claim, setClaim] = useState("");
  const [references, setReferences] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const repositoryId = repo || repos.data?.[0]?.id || "";
  const parents = commits.data?.filter((commit) => commit.repository_id === repositoryId) ?? [];
  const problem = error || repos.error || commits.error;

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const evidenceRefs = references.split(/[\s,]+/).filter(Boolean);
      await createDiscovery({ data: { repositoryId, parentId: parent || undefined, branch, title, claim, evidenceRefs } });
      setTitle(""); setClaim(""); setParent(""); setReferences(""); setOpen(false);
      await commits.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create discovery");
    } finally { setBusy(false); }
  }

  return <Page eyebrow="Git for AI discovery" title="Discoveries"
    description="Preserve claims, proposed operators, experiments, and refutations with exact parent lineage. Each commit remains a proposal; citations alone do not verify it."
    actions={<Button onClick={() => setOpen(!open)}><Plus className="size-4" />New discovery commit</Button>}>
    {problem && <div role="alert" className="mb-4 rounded-lg border border-red-800/40 bg-red-500/10 p-3 text-sm text-red-300">{problem}</div>}
    {open && <Card className="mb-6">
      <CardHeader title="Commit a proposed finding"><p className="mt-1 text-xs text-muted">Use a research prompt or write your own bounded claim. A prompt does not run an experiment or certify a result.</p></CardHeader>
      <form onSubmit={submit} className="grid gap-3 p-4 md:grid-cols-2">
        <label className="space-y-1"><span className="text-xs text-muted">Repository</span>
          <Select required value={repositoryId} onChange={(event) => { setRepo(event.target.value); setParent(""); }}>
            {!repos.data?.length && <option value="">Create a repository first</option>}
            {repos.data?.map((repository) => <option key={repository.id} value={repository.id}>{repository.name}</option>)}
          </Select>
        </label>
        <label className="space-y-1"><span className="text-xs text-muted">Branch</span><Input value={branch} onChange={(event) => setBranch(event.target.value)} required maxLength={80} /></label>
        <label className="space-y-1"><span className="text-xs text-muted">Parent commit (optional)</span>
          <Select value={parent} onChange={(event) => setParent(event.target.value)}><option value="">No parent</option>{parents.map((commit) => <option key={commit.id} value={commit.id}>{commit.title}</option>)}</Select>
        </label>
        <label className="space-y-1"><span className="text-xs text-muted">Title</span><Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} placeholder="Proposed operator separates two ambiguous cases" /></label>
        <div className="space-y-2 md:col-span-2">
          <p className="text-xs text-muted">Start an empty claim from a research prompt:</p>
          <div className="flex flex-wrap gap-2">{discoveryTemplates.map((template) => <Button key={template.id} type="button" disabled={busy || Boolean(claim.trim())} onClick={() => setClaim(template.claim)}>{template.label}</Button>)}</div>
          {claim.trim() && <p className="text-xs text-subtle">Prompts are available when the claim is empty, so your writing is preserved.</p>}
        </div>
        <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Claim and test plan</span><Textarea className="min-h-56" value={claim} onChange={(event) => setClaim(event.target.value)} required maxLength={6000} placeholder="State what the evidence supports, its scope, and what would refute it." /></label>
        <label className="space-y-1 md:col-span-2"><span className="text-xs text-muted">Evidence receipt IDs (optional)</span><Textarea value={references} onChange={(event) => setReferences(event.target.value)} maxLength={10100} placeholder="One evidence ID per line, or separated by commas" /><span className="block text-xs text-subtle">Up to 100 unique evidence receipts from this repository and workspace. Citing a receipt preserves lineage; it does not change the claim's status.</span></label>
        <div className="md:col-span-2"><Button disabled={busy || repos.loading || !repositoryId}>{busy ? "Committing…" : "Create immutable commit"}</Button></div>
      </form>
    </Card>}
    {commits.loading ? <p role="status" className="text-sm text-muted">Loading discovery commits…</p> : commits.data?.length ? <div className="space-y-3">{commits.data.map((commit) => <Card key={commit.id} className="p-4">
      <div className="flex items-start justify-between gap-4"><div className="min-w-0">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.13em] text-subtle"><GitBranch className="size-3" />{commit.repository_name} / {commit.branch}</div>
        <h2 className="mt-2 text-base font-semibold">{commit.title}</h2>
        <p className="mt-2 max-w-4xl whitespace-pre-wrap break-words text-sm leading-6 text-muted">{commit.claim}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-subtle"><Hash value={commit.content_hash} chars={16} />{commit.parent_id && <span>parent <Hash value={commit.parent_id} chars={8} /></span>}</div>
        {commit.evidence_refs_json.length > 0 && <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer">Cited evidence ({commit.evidence_refs_json.length})</summary><ul className="mt-2 space-y-1">{commit.evidence_refs_json.map((reference) => <li key={reference} className="break-all font-mono">{reference}</li>)}</ul></details>}
      </div><Status value={commit.status} /></div>
    </Card>)}</div> : !problem && <Empty title="No discovery commits" text="Commit a bounded claim, a proposed operator, or a negative result with its evidence and parent lineage." />}
  </Page>;
}

