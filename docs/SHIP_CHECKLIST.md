# HodgeForm 1.1.1 controlled-beta ship checklist

Scope: an invite-only, production-safe controlled beta. This checklist intentionally does not
claim broad public GA, universal AI safety, legal certification, or customer traction.

## Completed in the release workspace

- [x] **1. Preserve and verify the source baseline**
  Scope: exact 1.1 source archive and extracted tree.
  Evidence: source archive SHA-256 `6FD4184E8C318C66C0CCBF089C55C076CB8B1118AB1048581D199F2409E3A21B`; internal manifest verified 144/144 files.
  Acceptance: changes are made from an auditable baseline, not from the older partial 1.0 tree.
  Verify: compare the immutable archive hash and baseline commit `615da2b`.

- [x] **2. Repair the local release gate and Windows test discovery**
  Scope: test glob and URL path handling.
  Evidence: the former test command silently found zero tests on Windows; it now runs the actual suite and Windows-safe path resolution.
  Acceptance: `npm test` executes the full suite rather than returning a false green result.
  Verify: `npm test` reports 64 executed tests.

- [x] **3. Make production mode an invite-only controlled beta by default**
  Scope: release-channel config, Compose, examples, and readiness checks.
  Evidence: production defaults to `controlled_beta`; signup is rejected when enabled; public GA requires an explicit legal-review acknowledgement.
  Acceptance: an incomplete production configuration fails closed and readiness reports a structured failure.
  Verify: configure a missing required variable and call `GET /api/ready`.

- [x] **4. Add guarded first-operator provisioning**
  Scope: database-backed owner creation for a closed beta.
  Evidence: `scripts/provision-operator.mjs` accepts a password only through an environment secret, requires an exact confirmation phrase, verifies the account, creates an owner workspace, and refuses duplicates.
  Acceptance: no public signup is needed to create the initial operator.
  Verify: `node scripts/operator-provisioning-smoke.mjs` against PostgreSQL.

- [x] **5. Validate customer-facing product surfaces locally**
  Scope: landing, receipt verifier, authenticated workspace, gates, legal pages, liveness, and readiness.
  Evidence: HTTP/header matrix passed; Chrome captures show responsive landing, receipt verifier, overview, and gates screens.
  Acceptance: routes render successfully with CSP and request IDs.
  Verify: start the app and request `/`, `/verify`, `/login`, `/overview`, `/gates`, `/terms`, `/privacy`, `/security`, `/api/health`, and `/api/ready`.

## Completed release-source gates

- [x] **6. Run the final clean release gate**
  Scope: current 1.1.1 source after release hardening.
  Evidence: the clean hosted [`release-gate` run](https://github.com/ImDerekEarnhart/HodgeForm/actions/runs/33938167237) passed on 2026-09-05 for commit `79fe9da673549f96cd5d73b5a2ac3e65ef5cdf83`.
  Acceptance: fresh dependency install/audit, typecheck, lint, 64-test suite, trust and brand checks, production build, static scan, Python compilation, and every integration stage exited zero.
  Verify: open the linked run and its `verify` job.

- [x] **7. Publish the isolated private canonical repository**
  Scope: a new private HodgeForm repository only; never reuse Orbita projects or the polluted historical export.
  Evidence: [`ImDerekEarnhart/HodgeForm`](https://github.com/ImDerekEarnhart/HodgeForm) is private with `main` as its default branch; the release workflow is recorded against the canonical commit.
  Acceptance: the release source and CI history have a single canonical remote.
  Verify: `git remote -v`, `gh repo view`, and the linked Actions run. GitHub's branch-protection API is unavailable on the current private-repository plan, so the release relies on the private remote, passing workflow, and immutable tag rather than claiming unavailable branch protection.

- [x] **8. Obtain remote PostgreSQL and container evidence**
  Scope: GitHub Actions release workflow.
  Evidence: migration, guarded operator provisioning, tenant/API integration, auth lifecycle, database-loss readiness, PostgreSQL 17 backup/restore, Compose validation, production image build, and executor isolation all passed in the final [`release-gate`](https://github.com/ImDerekEarnhart/HodgeForm/actions/runs/33938167237). Filesystem/container Trivy and CodeQL analysis passed in the paired [`security-scan`](https://github.com/ImDerekEarnhart/HodgeForm/actions/runs/33938167278), which retains a SARIF artifact.
  Acceptance: the complete workflow is green for the canonical commit.
  Verify: the linked `release-gate` and `security-scan` runs.

## Must complete before an invite-only deployment is called live

- [ ] **9. Deploy to a new isolated production project**
  Scope: managed PostgreSQL plus application service, isolated from all Orbita services.
  Evidence needed: deployment URL, encrypted secrets, managed backup/PITR configuration, migration record, and a `200` production readiness response.
  Acceptance: the application starts only with production auth, HTTPS origin, signing keys, data-retention settings, and closed signup.
  Verify: `/api/health`, `/api/ready`, signed-in operator workflow, and offline receipt verification.

- [ ] **10. Provision the real beta operator and perform a final live acceptance pass**
  Scope: one verified owner account plus candidate/evidence/approval/receipt workflow.
  Evidence needed: operator email and password provided through the deployment secret channel; a non-sensitive acceptance record.
  Acceptance: a real invite-only operator can sign in and complete the core trust flow.
  Verify: run the documented operator command, sign in, create a candidate, submit admissible evidence, approve, retrieve, and independently verify a receipt.

- [x] **11. Freeze the distributable release**
  Scope: versioned commit/tag, regenerated source manifest, ZIP, and checksum.
  Evidence: `v1.1.1-controlled-beta.1` is assigned only after the final clean workflow succeeds; the source manifest is checked against canonical Git blob bytes to avoid Windows line-ending ambiguity, and its ZIP and SHA-256 are published with the private prerelease.
  Acceptance: customers and operators can identify the exact source used for the deployed beta.
  Verify: extract the prerelease ZIP into a fresh directory and compare `SOURCE_MANIFEST.sha256`.

## Explicitly outside a tonight-controlled-beta claim

- [ ] **12. Broad public GA external gates**
  Scope: independent penetration test, counsel review of deployed terms/privacy/retention, deliverability/domain proof for public signup, and uncoached customer onboarding/traction evidence.
  Evidence needed: reports, approvals, and measured customer outcomes from responsible parties.
  Acceptance: promotion to `public_ga` only after real external evidence exists.
  Verify: record each independent result; do not substitute code checks for it.
