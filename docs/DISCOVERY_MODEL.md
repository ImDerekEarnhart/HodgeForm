# Discovery repositories: the longer HodgeForm thesis

HodgeForm Gate is the first product surface. The deeper platform is a version-control layer for AI-generated knowledge.

## Git-like primitives

- **Discovery Commit** — content-addressed claim, evidence references, parent, author/agent identity, and execution provenance.
- **Branch** — a competing hypothesis, alternate analysis, replication attempt, or divergent agent strategy.
- **Gate / CI** — falsification, replication, policy, data-quality, and safety checks run against the exact commit.
- **Merge / Promotion** — explicit decision to synthesize or promote a surviving branch into trusted project knowledge while preserving all parents and contradictions.
- **Release / Tag** — trusted finding plus an immutable verification receipt.
- **History / Blame** — why a claim exists, where its evidence came from, which tests failed, and what superseded it.
- **Fork** — independent replication or alternate research path without rewriting the original history.

## Why Gate and Discovery are one architecture

Software release:

```text
candidate agent -> frozen gate -> evidence -> approval -> RELEASE/BLOCK receipt
```

Discovery promotion:

```text
candidate claim -> frozen verification plan -> evidence/falsification -> review -> TRUST/REFUTE receipt
```

The governed state transition is the same. Only the subject and evaluator change.

## v1 stance

Private repositories first. HodgeForm should integrate with existing source control, artifact stores, ELNs/LIMS, MLflow-style systems, and research packaging formats rather than trying to replace all of them.

A public cross-company discovery network should only be attempted after private repositories show repeated branching, replication, supersession, and promotion behavior. Network effects are a hypothesis, not a current moat.

## Interoperability target

The discovery bundle should remain exportable/importable through standard research packaging/provenance formats (for example RO-Crate-compatible packaging) while retaining HodgeForm-specific verification receipts as extensions.
