import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GitCommitHorizontal, ShieldCheck, Waypoints, FileCheck2, type LucideIcon } from "lucide-react";
import { RequireUser } from "@/lib/auth/gates";
import { getOverview } from "@/lib/gate/api";
import { useAsync } from "@/lib/use-async";
import { Page, Card, CardHeader, Empty } from "@/components/page";
import { Status, Hash } from "@/components/status";
import { DeveloperAccess } from "@/components/developer-access";

export const Route = createFileRoute("/overview")({ component: () => <RequireUser><Overview /></RequireUser> });

function Overview() {
  const { data, loading, error } = useAsync(() => getOverview());
  return <Page eyebrow="Release authority" title="Trust what ships" description="Git tells you what changed. HodgeForm determines what evidence that change requires before consequential AI work can become trusted.">
    {error && <div className="mb-5 rounded-lg border border-red-800/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([
      ["Repositories", data?.counts.repositories ?? 0, Waypoints], ["Candidates", data?.counts.candidates ?? 0, GitCommitHorizontal], ["Released", data?.counts.released ?? 0, ShieldCheck], ["Receipts", data?.counts.receipts ?? 0, FileCheck2],
    ] satisfies Array<[string, number, LucideIcon]>).map(([label,value,Icon]) => <Card key={label} className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><Icon className="size-4 text-subtle" /></div><div className="mt-5 text-3xl font-semibold tabular-nums">{loading ? "—" : String(value)}</div></Card>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <Card><CardHeader title="Latest release candidates" meta={<Link to="/gates" className="flex items-center gap-1 text-xs text-muted hover:text-fg">Open Gates <ArrowRight className="size-3" /></Link>} />
        <div className="divide-y divide-border">{data?.latest?.length ? data.latest.map((item: any) => <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{item.repository_name} · {item.version}</div><div className="mt-1 flex items-center gap-2 text-xs text-muted"><Hash value={item.artifact_hash} /> <span>{item.risk} risk</span></div></div><Status value={item.status} /></div>) : <div className="p-4"><Empty title="No candidates yet" text="Create a repository, freeze an exact agent version, then satisfy its compiled evidence obligations." /></div>}</div>
      </Card>
      <Card><CardHeader title="The invariant" /><div className="space-y-4 p-5"><div className="font-mono text-sm leading-7"><span className="text-accent">Models</span> propose evidence.<br/><span className="text-accent">Evidence</span> establishes scoped facts.<br/><span className="text-accent">Policy</span> decides.</div><p className="text-sm leading-6 text-muted">A probabilistic judge may discover a counterexample and block a release. It can never be the sole reason a blocking obligation passes.</p><div className="rounded-lg border border-border bg-bg p-3 font-mono text-[11px] text-muted">artifact hash → policy lock → admissible evidence → independent approval → signed receipt</div></div></Card>
    </div>
    <div className="mt-6"><DeveloperAccess /></div>
  </Page>;
}
