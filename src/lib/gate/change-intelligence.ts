import { z } from "zod";
import type { Requirement } from "./types";

export const COMPONENT_KINDS = ["prompt", "tool", "policy", "verifier", "memory", "world_model", "representation"] as const;
export const componentSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,39}$/),
  kind: z.enum(COMPONENT_KINDS),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  contract: z.string().trim().min(1).max(2000),
}).strict();
export const componentsSchema = z.array(componentSchema).max(64).refine(rows => new Set(rows.map(r => r.id)).size === rows.length, "Component IDs must be unique");
export type Component = z.infer<typeof componentSchema>;
export type ComponentChange = { id: string; kind: Component["kind"]; operation: "added" | "modified" | "removed"; before: Component | null; after: Component | null };

export function compareComponents(before: Component[] = [], after: Component[] = []): ComponentChange[] {
  componentsSchema.parse(before); componentsSchema.parse(after);
  const old = new Map(before.map(c => [c.id, c]));
  const next = new Map(after.map(c => [c.id, c]));
  return [...new Set([...old.keys(), ...next.keys()])].sort().flatMap(id => {
    const a = old.get(id) ?? null, b = next.get(id) ?? null;
    if (a && b && a.digest === b.digest && a.contract === b.contract && a.kind === b.kind) return [];
    // A kind change retains obligations for both the removed and replacement kind.
    if (a && b && a.kind !== b.kind) return [
      { id, kind: a.kind, operation: "removed" as const, before: a, after: null },
      { id, kind: b.kind, operation: "added" as const, before: null, after: b },
    ];
    return [{ id, kind: (b ?? a)!.kind, operation: !a ? "added" as const : !b ? "removed" as const : "modified" as const, before: a, after: b }];
  });
}

const rules: Record<Component["kind"], { title: string; reason: string }> = {
  prompt: { title: "Prompt behavior and injection", reason: "Replay intended behavior and adversarial instruction boundaries." },
  tool: { title: "Tool authority and arguments", reason: "Test authorization, argument validation, side effects and denied operations." },
  policy: { title: "Policy non-regression", reason: "Show that rejected transitions remain rejected; enumerate intentional policy changes." },
  verifier: { title: "Verifier soundness regression", reason: "Replay known valid and invalid fixtures, including negative controls and false acceptances." },
  memory: { title: "Memory provenance and isolation", reason: "Test tenant boundaries, source attribution, deletion and poisoned-memory behavior." },
  world_model: { title: "World-model falsification", reason: "Freeze assumptions, counterfactual predictions and untouched transition tests; preserve counterexamples." },
  representation: { title: "Representation adequacy", reason: "Preserve collision witnesses and test the frozen representation on untouched cases with explicit scope." },
};

export function componentObligations(changes: ComponentChange[]): Requirement[] {
  return changes.map(change => ({
    id: `HF-EVO-${change.kind}-${change.id}`,
    title: `${rules[change.kind].title}: ${change.id}`,
    reason: `${change.operation} ${change.kind} contract. ${rules[change.kind].reason}`,
    allowedEvidence: ["deterministic_test", "sandbox_run", "independent_verifier"],
    minimumIndependence: ["policy", "verifier", "representation", "world_model"].includes(change.kind) ? "independent" : "same_team",
    blocking: true,
    source: "semantic_diff",
  }));
}
