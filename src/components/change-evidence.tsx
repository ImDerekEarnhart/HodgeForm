import type { ComponentChange } from "@/lib/gate/change-intelligence";
import { Card, CardHeader } from "./page";

export function ComponentChanges({ changes }: { changes: ComponentChange[] }) {
  if (!changes.length) return null;
  return <Card><CardHeader title="Component and representation changes"><p className="mt-1 text-xs text-muted">Compared on the server with the last released candidate. These are declared contracts; independent verification must check their completeness.</p></CardHeader>
    <div className="divide-y divide-border">{changes.map(c => <div key={`${c.kind}-${c.id}`} className="p-4 text-sm">
      <p className="font-medium">{c.operation} · {c.kind} · {c.id}</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2">{(["before", "after"] as const).map(side => <div key={side} className="min-w-0 rounded border border-border p-3">
        <p className="text-xs uppercase text-subtle">{side}</p>
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{c[side]?.contract ?? "Absent"}</p>
        {c[side] && <code className="mt-2 block break-all text-[10px]">{c[side].digest}</code>}
      </div>)}</div>
      <p className="mt-2 text-xs text-muted">New obligation: HF-EVO-{c.kind}-{c.id}</p>
    </div>)}</div>
  </Card>;
}

const reasons: Record<string, string> = {
  satisfies: "Counts toward this obligation", counterexample: "Refutes this obligation; retained even after a later pass",
  inconclusive: "Does not establish a result", model_pass_is_not_authority: "Model PASS cannot establish satisfaction",
  insufficient_independence: "Verifier independence is below the frozen minimum",
  inadmissible_kind: "Evidence kind is not allowed by this obligation", different_obligation: "Bound to a different obligation",
};
export function EvidenceAssessments({ assessments }: { assessments: { evidenceId: string | null; reason: string }[] }) {
  const relevant = assessments.filter(a => a.reason !== "different_obligation");
  if (!relevant.length) return <p className="mt-2 text-xs text-amber-200">No evidence bound to this obligation.</p>;
  return <details className="mt-2 text-xs text-muted"><summary className="cursor-pointer">Why evidence counts ({relevant.length})</summary>
    <ul className="mt-2 space-y-2">{relevant.map((a, i) => <li key={a.evidenceId ?? i}><code className="break-all">{a.evidenceId}</code><p>{reasons[a.reason] ?? a.reason}</p></li>)}</ul>
  </details>;
}
