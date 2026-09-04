# HodgeForm Product Constitution

## Category

HodgeForm is the **trust compiler for machine-generated work**.

It is not an eval dashboard, LLM judge, runtime firewall, prompt-management tool, or generic approval workflow.

## Core invariant

**Models propose. Evidence establishes. Policy decides.**

A probabilistic model may suggest tests, score subjective behavior, or discover a counterexample. It does not control the release authority and cannot convert missing blocking proof into PASS.

## Product primitive

> A proposed change in trusted state cannot become trusted until the evidence obligations created by that change have been satisfied by admissible evidence and, where required, an authorized independent human has approved the exact frozen subject.

For AI releases this means:

```text
candidate -> semantic diff -> frozen obligations -> falsification/evidence -> approval -> RELEASE/BLOCK
```

For discovery repositories the same primitive becomes:

```text
claim -> verification plan -> falsification/evidence -> replication/review -> TRUST/REFUTE
```

## The five things to deepen

1. **Gate Policy Engine** — compile simple user intent and semantic authority changes into immutable requirements.
2. **Evidence Registry** — typed, content-addressed, artifact/policy-bound evidence with provenance and independence.
3. **Verifier SDK / Registry** — let deterministic tests, scanners, sandboxes, independent verifiers and models submit evidence without giving them decision authority.
4. **Release Authority** — small, hardened, fail-closed, transactional, human-authorized, cryptographically signed.
5. **CLI/CI distribution** — fit inside the pipelines teams already use; do not require a dashboard migration.

## Anti-goals

Do not weaken the gate to improve demo success. Do not make LLM scores compensatory. Do not let a client choose its own trust root. Do not accept caller-asserted evidence independence. Do not certify universal safety. Do not replace GitHub/GitLab/Jenkins/LangGraph/MCP when HodgeForm can become the trust substrate underneath them.

## Product test

If a developer changes an approved agent from `filesystem.read` to `filesystem.write`, HodgeForm should explain the new authority, compile the new destructive-filesystem obligations, reject an LLM-only PASS, require properly scoped evidence, enforce the approval boundary, and issue a signed receipt only for the exact candidate that satisfied the frozen gate.
