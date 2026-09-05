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

## Final gate still required

The system `C:` drive filled while the staged 1.1.1 copy was being prepared. Therefore this
file does **not** claim a new one-command `npm ci -> npm run release:check` proof for the final
version-metadata-only staged tree. The canonical GitHub Actions release job is required to
establish that clean proof, including real PostgreSQL, auth lifecycle, backup/restore, Compose,
image build, and executor-isolation checks.

See [`docs/SHIP_CHECKLIST.md`](docs/SHIP_CHECKLIST.md) for the exact remaining release gates.

## External gates before public GA

- managed-production deployment, HTTPS domain, transactional email, backup/PITR configuration;
- independent security/penetration review;
- legal review of deployed terms, privacy, and retention statements;
- uncoached customer onboarding and adoption evidence.

## Release semantics

A HodgeForm receipt means that the exact artifact identified in the receipt satisfied the exact
frozen HodgeForm gate using the recorded admissible evidence and approval identity. It does not
mean the artifact is universally safe, correct, compliant, or fit for every context.
