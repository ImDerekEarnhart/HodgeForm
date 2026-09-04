import type { Capability, CompiledPolicy, Independence, PolicyIntent, Requirement, Risk, TrustTransitionSummary } from "./types";

export const APPROVAL_PHRASE = "I reviewed this exact frozen gate";
const independenceRank: Record<Independence, number> = { self: 0, same_team: 1, independent: 2, formal: 3 };
export function independenceSatisfies(actual: Independence, required: Independence) { return independenceRank[actual] >= independenceRank[required]; }

const req = (id: string, title: string, reason: string, allowedEvidence: Requirement["allowedEvidence"], minimumIndependence: Independence = "self", source: Requirement["source"] = "pack"): Requirement => ({ id, title, reason, allowedEvidence, minimumIndependence, blocking: true, source });

const baseline: Requirement[] = [
  req("HF-ART-001", "Artifact integrity", "The evaluated artifact hash must equal the candidate selected for release.", ["deterministic_test", "static_analysis"], "self", "baseline"),
  req("HF-CAP-001", "Capability inventory", "Consequential authority must be explicitly inventoried before release.", ["static_analysis", "deterministic_test"], "self", "baseline"),
  req("HF-REG-001", "Regression gate", "A release must demonstrate that configured baseline behavior did not regress.", ["deterministic_test", "sandbox_run"], "self", "baseline"),
];

const byCapability: Partial<Record<Capability, Requirement[]>> = {
  "network.outbound": [req("HF-NET-001", "Outbound network boundary", "Networked agents require evidence that egress is restricted to declared destinations.", ["sandbox_run", "deterministic_test", "static_analysis"], "self", "capability")],
  "filesystem.write": [
    req("HF-FS-001", "Destructive filesystem behavior", "Write authority requires tests for deletion, overwrite, traversal and path-boundary behavior.", ["sandbox_run", "deterministic_test"], "self", "capability"),
    req("HF-FS-002", "Filesystem sandbox boundary", "Write-capable execution must be isolated from the application host.", ["sandbox_run", "static_analysis"], "same_team", "capability"),
  ],
  "shell.execute": [req("HF-CODE-001", "Code-execution isolation", "Arbitrary code execution must occur in a disposable constrained executor with no standing credentials.", ["sandbox_run", "static_analysis", "independent_verifier"], "same_team", "capability")],
  "database.write": [req("HF-DB-001", "Database write safety", "Write-capable agents require rollback/idempotency and authorization evidence.", ["deterministic_test", "sandbox_run"], "same_team", "capability")],
  "external_action.send_message": [req("HF-ACT-001", "External action authorization", "The agent can affect third parties; authorization and injection boundaries must be tested.", ["deterministic_test", "sandbox_run", "independent_verifier"], "same_team", "capability")],
  "external_action.email": [req("HF-ACT-002", "Email action authorization", "Outbound email requires recipient, replay and prompt-injection controls.", ["deterministic_test", "sandbox_run"], "same_team", "capability")],
  "payment.execute": [req("HF-PAY-001", "Payment authority", "Payment-capable agents require independent evidence for amount, recipient, replay and authorization boundaries.", ["deterministic_test", "independent_verifier"], "independent", "capability")],
  "secrets.read": [req("HF-SEC-001", "Secret exfiltration boundary", "Agents with secret access require deterministic evidence against disclosure and unauthorized tool transfer.", ["deterministic_test", "sandbox_run", "independent_verifier"], "same_team", "capability")],
  "data.pii": [req("HF-DATA-001", "PII handling", "PII access requires leakage and retention checks.", ["deterministic_test", "independent_verifier"], "same_team", "capability")],
  "data.phi": [req("HF-DATA-002", "PHI handling", "PHI access requires independent leakage, access-control and retention evidence.", ["deterministic_test", "independent_verifier"], "independent", "capability")],
};

const packRequirements: Record<PolicyIntent["pack"], Requirement[]> = {
  basic: [],
  networked: [req("HF-INJ-001", "Prompt-injection action boundary", "Networked agents must not convert untrusted content into undeclared authority.", ["deterministic_test", "sandbox_run", "llm_evaluation"], "self")],
  "code-execution": [req("HF-RES-001", "Resource exhaustion", "Code-running agents need CPU/memory/time bounds.", ["sandbox_run", "deterministic_test"], "self")],
  "action-taking": [req("HF-IRR-001", "Irreversible action safeguards", "External side effects require confirmation, authorization or compensating controls.", ["deterministic_test", "independent_verifier"], "same_team")],
  "high-risk": [
    req("HF-IND-001", "Independent verification", "High-risk releases require evidence produced independently of the candidate creator/evaluator.", ["independent_verifier"], "independent"),
    req("HF-ADV-001", "Adversarial falsification", "High-risk releases require a bounded adversarial attempt to refute release assumptions.", ["sandbox_run", "independent_verifier", "llm_evaluation"], "same_team"),
  ],
};

function dedupe(requirements: Requirement[]) {
  return [...new Map(requirements.map((r) => [r.id, r])).values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function recommendPolicyPack(capabilities: Capability[]): PolicyIntent["pack"] {
  const set = new Set(capabilities);
  if (set.has("payment.execute") || set.has("data.phi")) return "high-risk";
  if (set.has("shell.execute") || set.has("filesystem.write")) return "code-execution";
  if (set.has("database.write") || set.has("external_action.send_message") || set.has("external_action.email")) return "action-taking";
  if (set.has("network.outbound")) return "networked";
  return "basic";
}

export function inferRisk(capabilities: Capability[], intent: PolicyIntent): Risk {
  if (intent.pack === "high-risk" || capabilities.includes("payment.execute") || capabilities.includes("data.phi")) return "critical";
  if (capabilities.some((c) => ["shell.execute", "filesystem.write", "database.write", "secrets.read", "external_action.send_message", "external_action.email"].includes(c))) return "high";
  if (capabilities.includes("network.outbound") || intent.dataClass === "confidential" || intent.dataClass === "regulated") return "medium";
  return "low";
}

export function compilePolicy(input: { intent: PolicyIntent; capabilities: Capability[]; previousCapabilities?: Capability[]; organizationRequirements?: Requirement[]; organizationPacks?: PolicyIntent["pack"][]; forceSeparateApprover?: boolean }): CompiledPolicy {
  const capabilities = [...new Set(input.capabilities)].sort() as Capability[];
  const previous = new Set(input.previousCapabilities ?? []);
  const addedCapabilities = capabilities.filter((c) => !previous.has(c));
  const risk = inferRisk(capabilities, input.intent);
  const semanticDiffRequirements = addedCapabilities.flatMap((cap) => (byCapability[cap] ?? []).map((r) => ({ ...r, source: "semantic_diff" as const, reason: `New authority ${cap}: ${r.reason}` })));
  const organizationPacks = [...new Set(input.organizationPacks ?? [])];
  const organizationPackRequirements = organizationPacks.flatMap((pack) => packRequirements[pack].map((r) => ({ ...r, source: "organization" as const, reason: `Organization policy ${pack}: ${r.reason}` })));
  const all = dedupe([
    ...baseline,
    ...packRequirements[input.intent.pack],
    ...capabilities.flatMap((c) => byCapability[c] ?? []),
    ...semanticDiffRequirements,
    ...organizationPackRequirements,
    ...(input.organizationRequirements ?? []),
  ]);
  const separate = input.forceSeparateApprover === true || risk === "high" || risk === "critical" ? true : (input.intent.separateApprover ?? false);
  return {
    schema: "hodgeform-gate-policy/1",
    pack: input.intent.pack,
    packVersion: 1,
    organizationPacks,
    risk,
    dataClass: input.intent.dataClass,
    capabilities,
    addedCapabilities,
    requirements: all,
    approval: { required: true, separateFromCreator: separate, phrase: APPROVAL_PHRASE },
    invariant: "models_propose_evidence_policy_decides",
  };
}

export function evaluateRequirement(requirement: Requirement, evidence: { evidenceKind: string; outcome: string; independence: Independence }[]) {
  const eligible = evidence.filter((e) => requirement.allowedEvidence.includes(e.evidenceKind as never) && independenceSatisfies(e.independence, requirement.minimumIndependence));
  const failed = eligible.some((e) => e.outcome === "fail");
  // LLMs may discover counterexamples, but a probabilistic judge can never be the sole
  // authority that satisfies a blocking release obligation. Models propose evidence; policy decides.
  const passed = eligible.some((e) => e.outcome === "pass" && e.evidenceKind !== "llm_evaluation");
  return { eligibleCount: eligible.length, status: failed ? "fail" as const : passed ? "pass" as const : "missing" as const };
}

export function summarizeTrustTransition(policy: CompiledPolicy, semanticDiff: { removedCapabilities?: Capability[] } = {}): TrustTransitionSummary {
  return {
    schema: "hodgeform-trust-transition/1",
    invariant: policy.invariant,
    changed: { addedCapabilities: policy.addedCapabilities, removedCapabilities: semanticDiff.removedCapabilities ?? [] },
    proof: {
      totalObligations: policy.requirements.length,
      semanticObligationIds: policy.requirements.filter((r) => r.source === "semantic_diff").map((r) => r.id),
      blocking: policy.requirements.some((r) => r.blocking),
    },
    admissibility: { rule: "typed_evidence_with_minimum_independence", llmPassCanSatisfyBlockingObligation: false },
    approval: {
      required: policy.approval.required,
      separateFromCreator: policy.approval.separateFromCreator,
      requiredRole: policy.risk === "high" || policy.risk === "critical" ? "owner-or-admin" : "workspace-member",
    },
  };
}
