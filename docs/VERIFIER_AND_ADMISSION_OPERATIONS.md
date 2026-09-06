# Verifier and deployment admission operations

## Current boundary

The web service queues and authenticates work; it never launches containers. A separate operator-controlled Linux runner executes administrator-approved images. No new paid service is provisioned by this change. Railway production still has a direct Git deployment path: it is **not receipt-enforced**. Do not advertise provider enforcement until that bypass is removed and denial is tested against the real provider.

## Register and run a verifier

1. Register a verifier principal in the existing verifier registry. Independence is an operator assertion about real control/ownership, not a property of an Ed25519 key. Do not mark the candidate creator's runner independent of that creator.
2. Build and review the verifier. `/verifier/run` reads `/input/artifact` (a single immutable artifact file) and `/input/job.json`. It emits one JSON object with `outcome` (`pass`, `fail`, `inconclusive`), finite numeric `measurements`, and bounded `details`. A capability-inventory verifier also emits `inventory: {complete, detectedCapabilities}`. It must inspect the exact input, not trust a client report. A signed dishonest verifier can still lie; registration is a security decision.
3. Generate an Ed25519 key on the runner. Keep the private key there, outside workload input and output. Register only its public PEM in Workspace → Signed verification workers, with the reviewed immutable image digest and allowed obligation IDs.
4. Queue a job from Workspace against an exact candidate and optionally a frozen discovery experiment. Save its JSON as `job.json`. A verifier-bound API token with `evidence:write` can also read its pending jobs at `GET /api/v1/verifier-jobs`.
5. On the dedicated runner, using Node 22:

```sh
node --experimental-strip-types bin/verifier-runner.mjs \
  --job job.json --artifact artifact.bundle \
  --image registry.example/verifier@sha256:REVIEWED_DIGEST \
  --key /protected/worker-private.pem --out result.json --submit
```

Set `HODGEFORM_URL` and the verifier-bound `HODGEFORM_TOKEN` in the host process's protected environment. They are never mounted or passed to the container. Inputs are limited to 64 MiB; each run has no network, read-only root/input, non-root UID, dropped capabilities, 256 MiB memory, 64 PIDs and at most 120 seconds. The engine socket is never mounted. Output overflow, invalid JSON and timeouts are inconclusive. Containers are removed after the run. This is container isolation, not a microVM or a proof against kernel compromise; use a dedicated patched runner host and trusted engine configuration.

The endpoint validates exact job hash, signature, active identity, allowed image/kind/obligation, expiry and single-use consumption in the same transaction as evidence insertion. Generic evidence upload cannot mark execution authenticated. A frozen experiment compares numeric measurements with its precommitted thresholds; raw `outcome: pass` cannot override a failing metric. Experiments block release until all survive; all previous evidence remains available.

## Offline receipt admission

The operator supplies a pinned release public key and protected target configuration:

```json
{"namespace":"production","tenant":"workspace:YOUR_WORKSPACE","repositoryId":"YOUR_REPO","policyHash":"EXACT_64_HEX_POLICY_HASH","maxReceiptAgeSeconds":3600}
```

```sh
node --experimental-strip-types bin/deployment-admission.mjs \
  --target /protected/target.json --public-key /protected/release-public.pem \
  --receipt receipt.json --artifact-hash EXACT_DEPLOYED_ARTIFACT_SHA256
```

The strict command rejects BLOCK, missing obligations, stale/future decisions, wrong artifact, tenant, repository, policy or signer, and historical receipts predating evaluator version 2. It does not acquire provider credentials or deploy anything. Checking one bundle and rebuilding a different artifact afterward is invalid: the deployment must use the exact admitted artifact.

## Kubernetes admission adapter

The same executable supports `--serve --tls-key ... --tls-cert ... --client-ca ... --port 8443`. It requires mutual TLS. The API server's configured admission client identity must be signed by the dedicated CA; do not use an unrelated broad client CA. Protect this configuration and key from workload owners.

Configure a `ValidatingWebhookConfiguration` for Pod CREATE/UPDATE and `pods/ephemeralcontainers`, `failurePolicy: Fail`, `sideEffects: None`, `admissionReviewVersions: [v1]`, a namespace selector for the protected namespace, and the pinned service CA. Prevent workload identities from editing this webhook or removing the namespace label. Every main, init and ephemeral container needs an OCI digest and a corresponding signed document in the `hodgeform.com/receipts` annotation (JSON map of digest to signed receipt). The artifact hash must be the OCI manifest digest, not source files.

This adapter authenticates repeated admissions of the same approved image within a bounded time window, allowing replicas/restarts. It does not provide online revocation, one-time rollout credentials, rollback authorization or authenticated coverage of command overrides, mounts and security-context changes. Those deployment-spec changes need separate artifact binding before this may govern full workload transitions. It has not been installed in a live cluster in this work.

## Remaining production acceptance gates

- Provision or select a patched dedicated runner within the user's total $25/month hosting cap; run the container integration there.
- Independently review and pin real Orbita and Lean verifier images; preserve their exact scope and issue no formal-proof claim through the generic evidence route.
- Connect Orbita inactive candidates through authenticated import/lineage. The existing MCP connection is usable by the operator but is not an installed server-to-server bridge.
- Replace Railway Git auto-deploy with an artifact-preserving admission integration, restrict deploy credentials, test missing/forged/old receipt denial, and retain a governed recovery path.
- Add revocation and rollout authorization before claiming portable receipts are sufficient for long-lived production admission.

Do not upgrade `controlled_beta` to public GA merely because these components compile.

Provider contract references: [Docker runtime constraints](https://docs.docker.com/engine/containers/run/) and [Kubernetes admission webhook configuration](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/).
