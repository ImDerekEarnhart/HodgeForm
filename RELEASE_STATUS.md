# HodgeForm 1.1.1 controlled-beta verification status

This record covers the 2026-09-04 release finalization. It is not a penetration-test report,
legal certification, customer-traction proof, or universal safety claim.

## Source provenance

- Immutable 1.1 source archive SHA-256:
  `6FD4184E8C318C66C0CCBF089C55C076CB8B1118AB1048581D199F2409E3A21B`.
- Archive manifest verification: **144/144 expected files present and matching**, with no
  unlisted source files.
- The staged 1.1.1 tree adds release hardening and a patch version only; it does not replace
  the verified 1.1 provenance baseline.

## Local evidence gathered before final metadata freeze

- Fresh Node 22 dependency installation: **PASS**, 296 packages, 0 reported vulnerabilities.
- Dependency audit: `npm audit --omit=dev --audit-level=high` — **0 vulnerabilities**.
- TypeScript check: **PASS**.
- Expanded lint (source, tests, scripts, CLI, Vite config): **PASS**.
- Deterministic product/security suite: **64/64 PASS**. The Windows test command was corrected
  so this is a real executed suite rather than a zero-test false green result.
- Trust-boundary demo: **PASS** — artifact mutation, missing independent evidence, LLM-only
  PASS, and creator self-approval all BLOCK; the restored admissible path RELEASEs.
- TrustBench 0.1: **10/10 authority/obligation fixtures exact** and **4/4 evidence-admissibility
  fixtures exact**.
- Brand/product smoke, golden onboarding smoke, static source security scan, Vite/Nitro build,
  and Python reference-executor compilation: **PASS**.
- Local HTTP/header pass: public, auth, workspace, gate, verifier, legal, liveness, and
  readiness routes returned expected responses; rendered landing, verifier, overview, and
  gates screens were visually inspected.

## Final clean hosted verification — PASS

The staged copy was prepared on a full `C:` drive, so the final clean proof was deliberately run
in a fresh GitHub-hosted environment rather than being inferred from the local machine. The
canonical [`release-gate` run](https://github.com/ImDerekEarnhart/HodgeForm/actions/runs/33938167237)
passed on 2026-09-05 for commit `79fe9da673549f96cd5d73b5a2ac3e65ef5cdf83`.

- Fresh `npm ci`, production dependency audit, static scan, brand check, typecheck, lint,
  executed suite, TrustBench, and production build: **PASS**.
- PostgreSQL migration, guarded first-operator provisioning, tenant/API integration, password
  reset/session revocation lifecycle, database-loss readiness, and PostgreSQL 17 backup/restore:
  **PASS**.
- Production Compose, hardened application image, and no-network/auth/resource-limited executor
  smoke: **PASS**.
- Paired [`security-scan`](https://github.com/ImDerekEarnhart/HodgeForm/actions/runs/33938167278):
  Trivy filesystem/container scans and CodeQL analysis: **PASS**. The CodeQL SARIF is retained as
  a workflow artifact; this record does not claim that GitHub's hosted Code Scanning alert UI is
  enabled for the private repository.

See [`docs/SHIP_CHECKLIST.md`](docs/SHIP_CHECKLIST.md) for the remaining live-deployment gates.

## External gates before public GA

- managed-production deployment, HTTPS domain, transactional email, backup/PITR configuration;
- independent security/penetration review;
- legal review of deployed terms, privacy, and retention statements;
- uncoached customer onboarding and adoption evidence.

## Release semantics

A HodgeForm receipt means that the exact artifact identified in the receipt satisfied the exact
frozen HodgeForm gate using the recorded admissible evidence and approval identity. It does not
mean the artifact is universally safe, correct, compliant, or fit for every context.
