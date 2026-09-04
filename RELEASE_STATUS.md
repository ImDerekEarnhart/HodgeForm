# HodgeForm 1.1 Trust Compiler — release verification status

This file describes evidence gathered against this exact source tree during the 2026-09-04 finalization session. It is not a penetration-test report, legal certification, or universal safety proof.

## Passed in this environment

- Deterministic product/security suite: **62/62 PASS** after the 1.1 trust-compiler upgrades.
- Trust-boundary demo: **PASS** — artifact mutation, missing independent evidence, LLM-only PASS, and creator self-approval all produce BLOCK; restored admissible evidence reaches the RELEASE path.
- TrustBench 0.1: **10/10 authority/obligation fixtures exact** and **4/4 evidence-admissibility fixtures exact**.
- TypeScript syntax/transpile audit: **60 TS/TSX files, 0 diagnostics**.
- Static source security scan: **PASS**.
- Brand/product smoke: **PASS**.
- Golden onboarding smoke: **PASS**, two policy-intent lines in the fixture.
- Python reference executor compilation: **PASS**.

## Material 1.1 trust improvements

- Independent evidence requires a registered verifier principal rather than a caller-selected label.
- Verifier principals carry server-managed trust level and allowed evidence kinds.
- Machine tokens are explicitly scoped and may be bound to a verifier principal; no machine approval scope exists.
- Every newly recorded evidence receipt is server-bound to the exact candidate, artifact digest, frozen policy hash, requirement ID, token identity, and verifier identity before hashing.
- Candidate inspection exposes a first-class Trust Transition view: what changed, what must be proven, what evidence counts, and who may approve.
- `hodgeform demo`, `hodgeform benchmark`, and `hodgeform gate explain` make the trust boundary inspectable from the CLI.

## Not established in this container

A fresh dependency-backed production build is still not honestly established here. `npm ci` did not complete in this container (the process stalled until the tool transport timeout), so this session does **not** claim a fresh `npm ci -> typecheck -> lint -> Vite/Nitro build -> Docker build` pass for the exact 1.1 tree.

The included GitHub release workflow remains the authoritative place to execute those network/dependency-backed gates plus real PostgreSQL, auth HTTP lifecycle, backup/restore, executor-container, CodeQL, Trivy, and image scans on a normal runner.

External gates still required before broad public GA:

- deployment against the actual managed PostgreSQL service selected for production;
- real production transactional-email/domain configuration;
- independent security/penetration review;
- legal review of terms/privacy/retention claims;
- an uncoached human onboarding study for the under-10-minute promise.

## Release semantics

A HodgeForm receipt means that the exact artifact identified in the receipt satisfied the exact frozen HodgeForm gate using the recorded admissible evidence and approval identity. It does not mean the artifact is universally safe, correct, compliant, or fit for every context.
