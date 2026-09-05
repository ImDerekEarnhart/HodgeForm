# HodgeForm 1.1 — Trust Compiler

**HodgeForm is a deterministic trust compiler and release authority for consequential AI work.**

Git tells you what changed. HodgeForm determines what evidence that change requires before an AI artifact may become trusted.

The first product is **HodgeForm Gate**:

```text
exact artifact -> semantic capability diff -> frozen gate policy
              -> admissible evidence -> human approval -> signed RELEASE/BLOCK receipt
```

The longer-term repository layer applies the same primitives to AI-generated discoveries, experiments, and claims.

## Core invariant

**Models propose evidence. Evidence establishes scoped facts. Policy decides.**

An LLM may propose adversarial tests or discover a counterexample. An LLM `PASS` can never be the sole reason a blocking release obligation is satisfied.


Try the product boundary without configuring a server:

```bash
hodgeform demo
hodgeform benchmark
```

The demo blocks artifact mutation, missing independent evidence, LLM-only PASS, and creator self-approval before showing the restored RELEASE path. TrustBench freezes deterministic fixtures for authority-delta and evidence-admissibility behavior.

## What ships in 1.1

- Repositories for AI artifacts and discovery commits.
- Frozen release candidates bound to an exact SHA-256 artifact digest.
- Standard policy packs: `basic`, `networked`, `code-execution`, `action-taking`, `high-risk`.
- Semantic change control: newly introduced authority compiles additional evidence obligations.
- Typed evidence with admissibility and independence requirements.
- Four-eyes approval for high/critical-risk candidates.
- Workspace roles, invitations, revocation, and last-owner protection.
- Ed25519-signed `RELEASE` / `BLOCK` receipts.
- Offline CI verification against a separately pinned public key.
- CLI artifact hashing, deterministic capability scanning, auto policy recommendation, candidate/evidence submission, receipt retrieval, and receipt verification.
- Workspace-scoped CI API tokens. There is deliberately **no API-token release-approval endpoint**.
- Optional local-model red-team test proposals via any OpenAI-compatible endpoint such as Ollama, llama.cpp, or vLLM.
- Paid xAI fallback is disabled unless explicitly enabled.
- Reference networkless Python verifier executor. It is optional and not exposed as a public arbitrary-code API.
- Private/self-hosted and SaaS workspace deployment modes.
- Registered verifier principals and scoped machine tokens: independent evidence cannot be self-asserted by a caller.
- Server-bound evidence receipts that include candidate, artifact, frozen-policy, requirement, verifier, and token provenance before hashing.
- A first-class Trust Transition view: **what changed / what must be proven / what evidence counts / who can approve**.
- `hodgeform demo` for the four fail-closed boundary attacks and `hodgeform benchmark` for the open TrustBench fixtures.

## Five-minute local developer setup

Requirements: Node.js 22+, npm, and optionally Docker for Postgres/local models.

```bash
cp .env.example .env
# For local dev, set NODE_ENV=development and HODGEFORM_PUBLIC_RELEASE=false.
npm ci
npm run dev
```

Without `DATABASE_URL`, development uses an in-memory PGlite database. Public/production mode refuses to start without Postgres, auth, HTTPS origin, and receipt-signing keys.

Generate release-authority keys:

```bash
node bin/hodgeform.mjs keys generate
```

Keep the private key only on the HodgeForm release authority. Provision the generated public key to CI separately.

## CLI-first agent workflow

Create the tiny intent file:

```bash
node bin/hodgeform.mjs init
```

`hodgeform.agent.json` defaults to `policy.pack: "auto"`. Candidate submission hashes the exact artifact tree, runs a bounded deterministic capability scan, unions detected authority into the manifest, chooses a standard pack recommendation, submits the frozen candidate, and records an artifact-hash-bound scan report as capability-inventory evidence.

The CLI scanner is authenticated **self/static evidence**, not independent proof that HodgeForm re-read the artifact bytes on the server. Incomplete scans, omitted detected capabilities, or a scan digest that differs from the frozen artifact fail `HF-CAP-001`. For independent evidence, register a verifier principal and issue a verifier-bound scoped token; HodgeForm derives that evidence independence from the authenticated principal rather than the caller payload.

Create an API token in **Workspace** / **Developer access**, then:

```bash
export HODGEFORM_URL=https://hodgeform.example.com
export HODGEFORM_TOKEN=hf_live_...

node bin/hodgeform.mjs repository create my-agent --description "Production agent"
node bin/hodgeform.mjs repository list
node bin/hodgeform.mjs candidate submit hodgeform.agent.json
node bin/hodgeform.mjs candidate show cand_...
node bin/hodgeform.mjs gate explain cand_...
```

CI/verifiers can attach evidence:

```bash
node bin/hodgeform.mjs evidence record cand_... \
  --requirement HF-REG-001 \
  --kind deterministic_test \
  --outcome pass \
  --source github-actions \
  --payload regression-result.json
```

A human reviewer crosses the approval boundary in the authenticated HodgeForm UI. After the decision, CI can fetch and verify the receipt:

```bash
node bin/hodgeform.mjs receipt fetch cand_... --out release.json
node bin/hodgeform.mjs gate verify release.json --public-key ./hodgeform.pub
```

Verification exits non-zero for a `BLOCK` verdict, payload/hash tampering, invalid Ed25519 signature, or a signer that does not match the separately pinned public key.

## Local/private models

HodgeForm itself does not require an LLM to decide releases. Optional model-assisted features are proposal-only.

The model adapter speaks OpenAI-compatible HTTP:

```env
HODGEFORM_MODEL_BASE_URL=http://127.0.0.1:11434/v1
HODGEFORM_TEACHER_MODEL=qwen3:14b
HODGEFORM_STUDENT_MODEL=qwen3:8b
HODGEFORM_ALLOW_XAI_FALLBACK=false
```

Start Ollama locally:

```bash
docker compose -f docker-compose.local.yml up -d ollama
```

The **Propose tests** action in a frozen gate can ask the configured local model for bounded red-team ideas. Those suggestions do not alter policy or count as passing evidence.

## Production deployment

1. Copy `.env.production.example` to your secret-management system. Do **not** commit secrets.
2. Keep `HODGEFORM_RELEASE_CHANNEL=controlled_beta` and `HODGEFORM_ALLOW_SIGNUPS=false` for an invite-only beta.
3. Generate the Ed25519 release-authority keypair and separately pin the public key in CI.
4. Set a real domain, legal/contact/retention settings, and long random Postgres/Auth secrets.
5. Run:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

After migrations, provision the first verified owner without opening signup. The password is
read only from the secret environment; see [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

```bash
export HODGEFORM_OPERATOR_PASSWORD='use-a-password-manager-generated-secret'
export HODGEFORM_OPERATOR_CONFIRM='PROVISION_OPERATOR:operator@example.com'
npm run operator:provision -- operator@example.com "Operator name"
unset HODGEFORM_OPERATOR_PASSWORD HODGEFORM_OPERATOR_CONFIRM
```

`public_ga` is a separate promotion: it requires an explicit legal-review acknowledgement and
the independent external gates listed in [`docs/SHIP_CHECKLIST.md`](docs/SHIP_CHECKLIST.md).

Local model serving is optional:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml --profile local-models up -d --build
```

The reference verifier executor is also optional and isolated with `network_mode: none`:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml --profile sandbox up -d --build
```

For hostile multi-tenant arbitrary-code workloads, use disposable per-job containers or microVMs instead of the reference long-lived executor.

## Release verification

The repository's release gate is:

```bash
npm run release:check
python -m py_compile executor/server.py
```

CI additionally validates the production Compose file and builds the production Docker image. See `RELEASE_STATUS.md` for the evidence gathered against this exact source snapshot.

## Security and boundaries

Read [`SECURITY.md`](SECURITY.md), [`PRODUCT_CONSTITUTION.md`](PRODUCT_CONSTITUTION.md), [`docs/TRUST_PROTOCOL.md`](docs/TRUST_PROTOCOL.md), [`docs/VERIFIER_REGISTRY.md`](docs/VERIFIER_REGISTRY.md), and [`docs/TRUSTBENCH.md`](docs/TRUSTBENCH.md).

A signed receipt **does not mean an agent is universally safe**. It means the exact artifact identified by the receipt satisfied the exact frozen HodgeForm policy with the recorded admissible evidence and approval identity.

## Discovery repositories

See [`docs/DISCOVERY_MODEL.md`](docs/DISCOVERY_MODEL.md). Discovery is deliberately private-first in 1.0; HodgeForm is not claiming network effects or universal scientific verification from the current product.

## Product surfaces

- `/` — public product/brand landing page.
- `/verify` — convenience verification of a signed receipt against this deployment's configured release authority.
- `/overview` — authenticated workspace overview.
- `/gates`, `/repositories`, `/discoveries`, `/receipts`, `/workspace` — authenticated product surfaces.
- `bin/hodgeform.mjs` — CI/CLI integration; use `hodgeform gate verify` with a separately pinned public key for enforcement.

The web verifier is intentionally a convenience check. CI trust should pin the public key outside the HodgeForm application.
