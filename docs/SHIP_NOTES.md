# HodgeForm 1.1.1 controlled-beta release notes

## Release intent

HodgeForm 1.1.1 is the customer-ready controlled-beta release of the 1.1 Trust Compiler.
It is an invite-only release authority for consequential AI work, not a claim that an AI
artifact is universally safe, compliant, or correct.

## What changed after the immutable 1.1 source snapshot

- Fixed the Windows release command so it runs the real test suite rather than silently
  matching zero tests.
- Fixed Windows file-URL handling in onboarding, trust-compiler, and golden-path checks.
- Tightened TypeScript/JSON boundaries and lint coverage across source, tests, scripts, and CLI.
- Added explicit `development`, `controlled_beta`, and `public_ga` release channels. Production
  defaults to a closed controlled beta; public GA is an explicit promotion path.
- Added production readiness safeguards for auth, PostgreSQL, HTTPS origin, signing keys,
  legal/contact/retention configuration, and disabled signup during the beta.
- Added a guarded, auditable first-operator provisioning workflow and remote PostgreSQL smoke test.
- Made `/api/health` a liveness-only endpoint and `/api/ready` a configuration-plus-database
  readiness endpoint.

## Known boundaries

- Receipt records are intentionally long-lived audit artifacts. Evidence/receipt expiration
  controls are not exposed until their semantics are implemented and policy-backed.
- The reference executor is not a public arbitrary-code service. Hostile multi-tenant code
  needs disposable containers or microVMs.
- A passing HodgeForm receipt is scoped to its exact artifact, policy, evidence, approval, and
  signer. It is not a safety certification.

## Promotion rule

Keep `HODGEFORM_RELEASE_CHANNEL=controlled_beta` and
`HODGEFORM_ALLOW_SIGNUPS=false` for the beta. Do not set `public_ga` until the external
security, legal, deliverability, and customer-evidence gates in `SHIP_CHECKLIST.md` are complete.
