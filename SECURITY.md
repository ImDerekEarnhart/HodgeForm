# HodgeForm security model

## Release-authority boundary

HodgeForm separates candidate creation, evidence collection, human approval, and receipt signing.

- The browser is not authoritative for frozen policy text or policy hashes.
- High/critical-risk gates require a different candidate creator and approver.
- In SaaS workspaces, high/critical approvals require an `owner` or `admin` role.
- Workspace owners can revoke members; the last owner cannot be removed/demoted.
- CI API tokens may submit/read candidates and evidence and retrieve receipts. They have no route that performs human release approval.
- LLM `PASS` results never independently satisfy blocking obligations.
- LLM-discovered counterexamples may fail a requirement.
- Generic callers cannot self-assert `formal_proof`; that evidence kind is reserved for a registered proof-verifier adapter.
- Capability scan evidence is bound to the exact candidate artifact hash and fails closed on incomplete coverage or undeclared detected authority. The built-in v1 scanner remains authenticated self/static evidence; it is not described as an independent server-side reproduction.

## Signed receipts

Release receipts are Ed25519 signed over canonical JSON. Production signing configuration rejects malformed or mismatched public/private key pairs before a receipt can be minted. CI must verify them using a public key provisioned independently from the receipt itself. A receipt carries a signer fingerprint for comparison, but the receipt's own key identity is not a trust root.

HodgeForm receipts attest only that the exact configured gate was satisfied. They are not universal safety, correctness, compliance, causality, or scientific-validity certificates.

## Tenant isolation

Product records are scoped by `tenant_id`. SaaS tenants are team workspaces with explicit membership. API tokens record the workspace tenant at creation and are re-checked against current membership on each authenticated request; removing a member therefore invalidates their access to that workspace even if an old token still exists.

Private mode uses one configured deployment tenant and should be placed behind the operator's own network/access controls.

## Arbitrary code

The web process does not spawn model-generated Python or shell code. The optional reference executor uses a Unix socket and is deployed with no network stack, a read-only root filesystem, resource limits, dropped capabilities, and privilege drop before handling submitted code.

The reference executor is for single-tenant/private verifier workloads. It also validates `HODGEFORM_SANDBOX_TOKEN` when configured; the local Unix-socket topology additionally limits access to containers sharing that socket volume. Hostile public multi-tenant arbitrary code should use disposable per-job isolation such as hardened containers or microVMs.

## Local models

The optional model adapter is configured by server environment, not end-user URL input. OpenAI-compatible local endpoints are preferred; paid xAI fallback is opt-in. Model outputs are proposal/evidence inputs, not release authority.

## Public-release fail-closed checks

Production/public mode refuses normal traffic when required configuration is missing, including authentication, Postgres, sufficiently long auth secret, HTTPS auth origin, and Ed25519 release signing keys. Open public signup additionally requires configured transactional email.

## Reporting

For a real public deployment, publish a dedicated security contact (for example `security@your-domain`) and a vulnerability disclosure policy before broad promotion.
