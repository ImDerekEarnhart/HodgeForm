# HodgeForm: Product Manifesto, Brand Constitution, and Production Handoff

**Canonical handoff document for HodgeForm 1.1 and beyond**  
**Status:** product constitution + implementation handoff + production completion brief  
**Audience:** engineers, product designers, security engineers, operators, founders, investors, design partners, and future AI agents working on the repository  
**Current source snapshot:** this repository. See `RELEASE_STATUS.md` and `SOURCE_MANIFEST.sha256` for the exact packaged build identity.

---

## 0. Read this first

HodgeForm exists to solve one deceptively simple problem:

> **When an AI system changes, what evidence must exist before that exact change is allowed to become trusted?**

Git can tell an organization that code changed. An observability platform can tell it what happened after software ran. An LLM evaluator can offer a probabilistic opinion. None of those things, by themselves, provide a deterministic, fail-closed answer to whether a consequential AI artifact has satisfied the organization’s declared release standard.

HodgeForm is intended to become that missing layer.

The first commercial product is **HodgeForm Gate**: a release authority for AI agents and other consequential AI artifacts. A candidate is bound to exact bytes, its authority is inventoried, a release policy is compiled and frozen before evaluation, evidence is collected under typed admissibility rules, required human review is enforced, and HodgeForm emits a signed `RELEASE` or `BLOCK` receipt that CI/CD can verify independently.

The longer thesis is larger: the same machinery can govern AI-generated discoveries, experiments, analyses, policies, and machine-created knowledge. HodgeForm can become a versioned trust layer for machine-generated work: a system in which claims can be branched, challenged, falsified, reproduced, superseded, promoted, and traced to exact evidence.

This document is both a manifesto and a guardrail. Anyone taking over the project should be free to improve its engineering, usability, design, distribution, and commercial model aggressively. They should **not** be free to weaken the trust boundary in order to make the product easier to demo or sell.

### If you are picking this up for a specific role

- **Engineer:** start with Sections 5–13, 18–22, and the current repository files listed in Section 26.
- **Product designer:** start with Sections 2–4 and 14–17. The product should feel like critical infrastructure, not an AI toy.
- **Security / infrastructure engineer:** start with Sections 6–13 and 20–23.
- **Founder / GTM lead:** start with Sections 1–4, 16–19, and 24.
- **Investor / board member:** start with Sections 1, 3, 18, 19, 24, and 25.
- **Future AI agent working on HodgeForm:** read Sections 0, 4, 5, 12, 21, and 25 before modifying code. Treat “current truth,” “target state,” and “hypothesis” as different epistemic classes. Never convert a desired roadmap item into a claim that it already exists.

---

# Part I — The company thesis

## 1. The one-sentence company

> **HodgeForm is the deterministic trust compiler and release authority for consequential AI work.**

The primary positioning sentence is:

> **Git tells you what changed. HodgeForm determines what evidence that change requires before it may become trusted.**

The internal operating invariant is:

> **Models propose. Evidence establishes. Policy decides.**

The narrow product wedge is:

> **HodgeForm Gate tests the exact AI artifact, freezes the release standard, records admissible evidence, enforces required human approval, and issues a signed receipt that CI/CD can verify.**

The long-term thesis is:

> **Git gave software a history. HodgeForm can give machine-generated work a trustworthy one.**

Do not confuse these layers. Gate is the first product and revenue wedge. The larger trust graph is the platform thesis. Discovery is the long-term expansion path. A new owner should resist trying to sell all three on the first screen.

## 2. The category HodgeForm is trying to create

HodgeForm is **not** another generic LLM evaluation dashboard. It is not merely “human approval for agents.” It is not a prompt-quality scorecard. It is not an agent framework.

The category is better described as:

- AI release authority
- semantic change control
- evidence-gated deployment
- trust compiler for machine-generated work
- cryptographically verifiable AI change control

A useful metaphor is **“TLS certificate for machine-generated work,”** with one important limitation: HodgeForm must never claim that a receipt means universal safety. A receipt means only that one exact artifact satisfied one exact frozen policy using the recorded evidence and approval identities.

That scoped semantics is a strength, not a weakness. Universal AI safety certification is not credible. Exact-artifact / exact-policy / exact-evidence attestation is.

## 3. The problem

Organizations are moving from AI that answers questions to AI that can act: send messages, edit files, write databases, execute code, initiate payments, access secrets, and generate conclusions that humans may rely upon.

The traditional software stack can answer questions such as:

- Which code commit changed?
- Which tests ran?
- Which service emitted an error?
- Which person approved a pull request?

But the consequential AI question is different:

> **Did this change expand what the machine is allowed or able to do, and if so, what new evidence must exist before that added authority can ship?**

Examples:

- An agent gains `filesystem.write`.
- A support agent gains outbound email.
- A research agent begins reading PHI.
- A coding agent gains shell access.
- A finance agent gains payment execution.
- A model upgrade changes tool-selection behavior while code remains almost unchanged.

Git sees a diff. HodgeForm should see a **change in authority**.

That is semantic change control.

## 4. The product constitution: principles that must not be weakened

These are non-negotiable unless the company explicitly decides to build a different product.

### 4.1 Exact artifacts, not vibes

Every consequential decision must identify the exact subject: artifact SHA-256, policy hash, evidence hashes, signer identity, and relevant environment/version metadata. A test result for artifact A must never silently authorize artifact B.

### 4.2 Freeze before judging

The authoritative release requirements are compiled and frozen before the decision. A developer must not be able to observe a failure and then silently weaken the required evidence while preserving the same release identity.

### 4.3 Models are powerful participants, never the final authority

LLMs can:

- propose tests
- generate attacks
- discover counterexamples
- summarize evidence
- help classify risk
- draft policies for review

LLMs must not, by their opinion alone:

- satisfy a blocking release requirement
- alter the frozen policy
- mint a release receipt
- perform human approval
- convert missing evidence into passing evidence

A model-generated `FAIL` may be valuable because a counterexample is evidence of failure. A model-generated `PASS` is not sufficient proof that a required property holds.

### 4.4 Missing evidence is not a pass

Fail closed. “Not observed,” “not tested,” “not available,” and “the evaluator seemed confident” are not synonyms for “satisfied.”

### 4.5 Evidence has type, scope, provenance, and independence

A unit test, sandbox trace, static scan, independent verifier, formal proof, human approval, and LLM evaluation are not interchangeable. HodgeForm must know what kind of evidence is admissible for each requirement and how independent that evidence must be.

### 4.6 High-risk changes require separation of duties

High/critical-risk releases must support and, where configured, require four-eyes approval. The candidate creator cannot approve the same high-risk transition. Machine API tokens never stand in for the human approval identity.

### 4.7 Receipts are attestations, not universal guarantees

The product must say exactly what a receipt means:

> This exact artifact satisfied this exact configured gate with these exact admissible evidence records and this exact authorization event.

It must not say:

> This AI is safe, correct, compliant, truthful, or harmless in all contexts.

### 4.8 Preserve failures

A `BLOCK`, failed hypothesis, rejected verifier, superseded policy, and negative experiment should remain first-class history. HodgeForm becomes more valuable if it remembers what failed and why.

### 4.9 The trust system itself should be governed

Where practical, changes to policy engines, verifier admission rules, and trust semantics should be treated more rigorously than ordinary UI changes. HodgeForm is already dogfooding this principle through governed, append-only problem loops and improvement candidates.

### 4.10 Never weaken the core to make the demo easier

If a design choice creates friction, solve the friction. Do not quietly remove the boundary.

---

# Part II — The product

## 5. The core object model

The finished product should keep a small, legible set of top-level objects.

### Workspace

The enterprise/tenant boundary. Contains members, roles, repositories, API tokens, organization policy overlays, trusted verifier identities, signing configuration, and audit events.

### Repository

A logical project containing a lineage of AI artifacts or discovery objects. HodgeForm is not intended to replace Git; a HodgeForm repository can point to source control/artifact storage while owning trust history.

### Candidate

An exact proposed transition. For Gate, this is commonly an agent/model/application version bound to an artifact digest and manifest.

### Capability inventory

The consequential authority associated with the candidate: network, filesystem, shell, databases, external actions, payments, secrets, PII/PHI, and future capability families.

### Policy intent

Small human-facing configuration: standard pack, data class, perhaps a few explicit controls. This is not the final release policy.

### Compiled gate policy

The authoritative machine-evaluable policy created from:

`organization overlays + standard pack + data class + declared capabilities + detected capabilities + semantic diff + risk rules`

It is frozen and content-addressed.

### Requirement / obligation

One concrete evidence obligation, such as artifact integrity, capability inventory, destructive filesystem behavior, prompt-injection boundary, payment authorization, independent verification, or regression testing.

### Evidence receipt

A typed, append-only record associated with one requirement and one exact candidate. Carries outcome, source, provenance, independence, payload hash, and ideally future verifier attestation.

### Release decision

The deterministic evaluation of frozen requirements plus required human authorization.

### Signed receipt

A portable signed `RELEASE` or `BLOCK` artifact that can be verified without trusting the HodgeForm web interface.

### Discovery commit

Long-term object: a content-addressed claim/experiment/result with parent lineage, evidence, execution provenance, and trust state. It reuses the same gate/evidence/receipt model.

## 6. The canonical Gate workflow

The canonical enterprise path should be:

```text
1. source / agent changes
2. exact artifact is hashed
3. capability inventory is declared + scanned
4. semantic authority diff is computed against prior trusted version
5. human-friendly policy intent is resolved
6. HodgeForm compiles and freezes the authoritative gate
7. CI/verifiers run required checks
8. typed evidence is attached to exact requirements
9. deterministic evaluator computes missing/pass/fail
10. required human reviewer approves the exact frozen gate
11. release authority signs RELEASE or BLOCK
12. CI independently verifies the signed receipt using a pinned public key
13. deployment proceeds only for valid RELEASE
```

The user experience must make each transition understandable without forcing the developer to understand the internal ontology.

## 7. Semantic change control

This is one of the strongest product concepts and should be treated as a core differentiator.

HodgeForm should not only ask “what files changed?” It should ask “what **authority** changed?”

Current capabilities include:

- `network.outbound`
- `filesystem.read`
- `filesystem.write`
- `shell.execute`
- `database.read`
- `database.write`
- `external_action.send_message`
- `external_action.email`
- `payment.execute`
- `secrets.read`
- `data.pii`
- `data.phi`

A candidate that newly gains `filesystem.write` should automatically acquire destructive-behavior and sandbox-boundary obligations even if a developer did not manually add those rules.

A candidate that newly gains `payment.execute` should be treated as critical-risk and require independent evidence.

The capability system must evolve, but it should remain explainable. Avoid creating hundreds of opaque labels. Prefer a compact ontology with structured parameters where needed.

### Desired future shape

A future semantic diff may include not only binary capabilities but bounded authority descriptions:

```yaml
network:
  outbound:
    destinations: [api.stripe.com]
filesystem:
  write:
    roots: [/workspace/output]
payment:
  execute:
    max_amount_usd: 500
    recipients: [approved_customer_refunds]
```

Then HodgeForm can distinguish “still has payment authority” from “payment limit expanded from $50 to $5,000,” which is the kind of semantic diff that creates durable value.

## 8. Policy Packs: solve compliance complexity without making developers policy experts

The investor cold-start concern is real: if onboarding requires learning a formal logic language, adoption dies.

The user should choose **intent**. HodgeForm should compile **policy**.

Current standard packs:

- `basic`
- `networked`
- `code-execution`
- `action-taking`
- `high-risk`

The CLI can recommend a pack from detected authority. That recommendation is convenience, not authority; the server compiler remains authoritative.

The long-term policy hierarchy should be:

### Level 1 — HodgeForm standard packs

Curated defaults for common agent classes. These should be versioned, signed, documented, and upgradeable.

### Level 2 — Organization overlays

Security/AI-platform teams define mandatory requirements once. Developers can add stricter project controls but cannot weaken organization policy.

### Level 3 — Expert/custom packs

Advanced teams can define custom verifiers/requirements. This must not become the first-run experience.

### Policy UX rule

For 80% of ordinary onboarding, users should manually author **fewer than 10 lines of policy configuration**.

A typical first config should look closer to:

```yaml
policy: auto
data: confidential
```

than to a formal verification language.

## 9. Evidence admissibility

The release engine is defensible only if evidence types are semantically distinct.

Current evidence kinds include:

- deterministic test
- sandbox run
- static analysis
- LLM evaluation
- independent verifier
- formal proof (reserved; not caller-self-assertable)
- human approval

Current independence levels include:

- self
- same team
- independent
- formal

The policy decides which evidence kinds and independence levels are admissible for a requirement.

The key invariant currently encoded in `src/lib/gate/policy.ts` is:

- any eligible `fail` evidence can fail a requirement
- a `pass` must come from eligible non-LLM evidence
- an LLM `pass` alone never satisfies a blocking requirement

This rule is easy to explain and should remain easy to test.

### Future evidence strength

The next major verifier improvement should be provenance-bound evidence: signed attestations whose subject digest is the exact artifact and whose verifier identity is trusted by organization policy. Prefer interoperable attestation envelopes where practical rather than inventing a closed protocol.

Important: a cryptographic signature proves provenance/integrity, not scanner completeness or scientific truth. Keep those dimensions separate.

## 10. Release receipts

The signed receipt is the portable product primitive.

It should be usable by:

- GitHub Actions
- GitLab CI
- Jenkins
- Buildkite
- Argo / deployment controllers
- internal release systems
- auditors
- offline verification tools

The trust root is the independently provisioned organization public key, not a key embedded in the receipt.

A receipt should bind at minimum:

- receipt schema/version
- exact candidate/artifact digest
- repository/workspace identity
- frozen policy hash
- policy version/pack
- evidence snapshot / requirement outcomes
- approver identity or authorized review event
- decision timestamp
- verdict: RELEASE or BLOCK
- signer identity/fingerprint
- signature

### Receipt copy rule

Never label the output “safe certificate.” Prefer:

- release receipt
- trust receipt
- gate receipt
- evidence-backed release attestation

Copy must preserve scoped meaning.

## 11. Human approval

Human approval is not a decorative button. It is an authority transition.

The final product must support:

- distinct candidate creator and approver for high/critical risk
- workspace role checks
- explicit exact-hash review context
- a confirmation phrase or equivalent high-intent action
- immutable audit history
- no bearer-token / CI route that performs the human transition

Over time, enterprise customers will likely require integrations with identity providers, MFA, delegated approver groups, and time-bounded emergency procedures. Those features can improve usability but must not collapse the identity boundary.

## 12. CLI and CI are the distribution wedge

The product should be installable into existing workflows rather than demand a new operational universe.

The current CLI lives at `bin/hodgeform.mjs` and supports key generation, repository creation/listing, exact artifact hashing, deterministic scanning, candidate submission, evidence recording, receipt retrieval, and receipt verification.

The intended golden path is:

```bash
hodgeform init
hodgeform repository create payments-agent
hodgeform candidate submit hodgeform.agent.json
# CI runs verifiers / records evidence
hodgeform receipt fetch cand_... --out release.json
hodgeform gate verify release.json --public-key ./hodgeform.pub
```

### CLI design rules

- Default to the correct safe path.
- Errors must say what is missing and what command/action fixes it.
- Never require dashboard interaction for machine tasks that can safely be API-driven.
- Never add a machine approval endpoint merely for convenience.
- Human review can remain web-based until a secure signed CLI approval experience is deliberately designed.
- Exit codes should be deterministic and CI-friendly.
- Every command should have `--json` or machine-readable output as the CLI matures.

## 13. Models and isolated execution

### Local-first models

HodgeForm's release authority must not require paid inference.

The optional model layer speaks OpenAI-compatible HTTP and can target local/private runtimes such as Ollama, llama.cpp, or vLLM. Paid fallback must remain explicit opt-in.

Use models for:

- adversarial test proposals
- attack generation
- evidence summarization
- anomaly hypotheses
- onboarding assistance

Never use model confidence as the release root of trust.

### Executor

The current reference verifier executor is a separate Python service/container with an isolated Unix-socket topology, network disabled in the reference deployment, resource restrictions, capability drops, read-only root filesystem, and optional service token.

Important operational nuance: the current architecture can run the executor as a long-lived isolated service, so do not assume every verification pays a full Docker startup penalty.

### Executor roadmap

Before rewriting the runtime around Wasm or Firecracker:

1. instrument total gate latency
2. separate policy/evidence evaluation from actual verifier execution
3. measure queue time and executor cold/warm latency
4. measure model inference separately
5. only replace the executor if isolation startup is material to developer wait time or threat-model requirements

A future executor interface should allow:

- long-lived private isolated worker
- pooled disposable containers
- Wasm/WASI for compatible deterministic checks
- Firecracker/microVM for hostile code
- external enterprise verifier service

The trust layer should depend on signed/typed receipts, not on one runtime technology.

---

# Part III — Who the product is for

## 14. Primary users and buyers

### Economic buyer: Head / VP of AI Platform or AI Engineering

They are responsible for getting many agent teams into production without creating unbounded operational risk. They care about standardization, release velocity, integration effort, and evidence that can survive security review.

### Co-buyer / veto holder: CISO, AppSec, AI Security, Model Risk

They care about separation of duties, auditability, exact artifact binding, data boundaries, independent evidence, and avoiding probabilistic systems certifying themselves.

### Daily user: AI / platform / DevOps engineer

They care about one thing: do not make shipping miserable. HodgeForm must explain blocks clearly and integrate into tools they already use.

### Reviewer / approver

They need to understand exactly what changed, what evidence exists, what failed, and what they are authorizing without reading raw logs for an hour.

### Auditor / governance lead

They need reproducible evidence packs, history, identity, and clear scoped semantics.

## 15. Broad utility without becoming a vague platform

HodgeForm should be easy for different users to apply to their own consequential transitions without rewriting the trust engine.

Examples:

### Code agent

A coding agent gains shell execution. HodgeForm adds isolation/resource obligations and blocks until evidence exists.

### Customer support agent

A support agent gains outbound email or Slack posting. HodgeForm requires authorization/injection boundary evidence.

### Financial agent

A finance workflow gains payment execution. HodgeForm escalates to critical risk and independent verification.

### Healthcare / regulated data agent

An agent gains PHI access. HodgeForm requires stricter independent evidence and data-handling controls. This does **not** by itself make the deployment HIPAA compliant; compliance is a separate organizational program.

### Research agent

An autonomous research system produces a candidate claim. The same mechanism can freeze the claim, require replication/falsification evidence, and promote or refute it into a trusted repository.

### Security investigation

A machine-generated conclusion can be treated as a candidate finding with evidence lineage and required human promotion.

The goal is a **general trust primitive with a narrow initial GTM**, not a generic workflow builder.

---

# Part IV — Brand and ideal product image

## 16. Brand architecture

Recommended naming hierarchy:

- **Company / platform:** HodgeForm
- **First product:** HodgeForm Gate
- **Category descriptor:** Trust compiler / AI release authority
- **Long-term repository layer:** HodgeForm Repositories / Discovery (do not over-brand prematurely)

Primary hero copy:

> **Trust what ships.**

Primary subhead:

> Git tells you what changed. HodgeForm determines what evidence that change requires before consequential AI work can become trusted.

Primary invariant:

> **Models propose. Evidence establishes. Policy decides.**

Short enterprise proof line:

> **Exact artifact. Frozen policy. Admissible evidence. Independent approval. Signed receipt.**

## 17. Brand personality

HodgeForm should feel like a combination of:

- certificate authority
- modern CI/CD control plane
- scientific instrument
- security infrastructure
- version-control history

It should **not** feel like:

- a chatbot
- a futuristic AI toy
- a crypto product
- compliance paperwork software
- a fear-based cybersecurity landing page
- a generic “AI copilot”

### Personality adjectives

- precise
- calm
- rigorous
- understated
- competent
- inspectable
- developer-native
- institutional without being bureaucratic

### Emotional target

The user should feel:

> “This system is strict, but I understand exactly why it is strict, and it helps me ship with confidence.”

Not:

> “This tool is here to scare me, score me, or prevent me from doing my job.”

## 18. Visual design system

The current visual direction is strong and should be evolved rather than replaced casually.

Current base palette from `src/styles.css`:

- **Graphite background:** `#090B0D`
- **Elevated graphite:** `#101317`
- **Subtle surface:** `#171B20`
- **Warm foreground / bone:** `#F2F0EB`
- **Muted:** `#9B9B96`
- **Steel accent:** `#9DB8C9`

Recommended signal colors should remain restrained:

- green = satisfied / RELEASE
- amber = missing evidence / review required / semantic expansion
- red = failed / BLOCK
- blue/steel = neutral trust/information

### Visual rules

- Dark-first is appropriate for the technical control-plane product, but accessibility contrast must be audited.
- Use mono typography for hashes, IDs, policy requirement IDs, evidence provenance, and CLI-like artifacts.
- Use sans-serif for narrative/product text.
- Dense information is acceptable when hierarchy is excellent.
- Prefer cards, ledgers, timelines, diffs, and clear state transitions over decorative illustrations.
- Motion should explain transitions, not entertain. A gate changing from missing → pass → release can animate subtly; avoid cinematic AI effects.
- Never use glowing robot brains, neon neural networks, humanoid assistants, or “magic” sparkles as core brand language.

### Product iconography

Prefer primitives such as:

- gate/checkpoint
- signed document/receipt
- branch/commit
- shield with evidence mark
- hash / fingerprint
- layered trust states

Avoid padlock-only branding; HodgeForm is broader than access security.

## 19. Voice and copywriting rules

HodgeForm should speak in short, declarative sentences.

Good:

> `BLOCKED — filesystem.write was added. Evidence HF-FS-001 and HF-FS-002 is missing.`

Good:

> `This receipt attests to this exact configured gate. It is not a universal safety certificate.`

Bad:

> “Our revolutionary AI-powered safety engine intelligently ensures that your autonomous workforce is always secure.”

Avoid:

- “AI magic”
- “100% safe”
- “guaranteed hallucination-free”
- “fully compliant” without a specific verified certification context
- existential AGI rhetoric in product UX
- vague “trust score” outputs that cannot be decomposed

Every blocked state should answer:

1. what changed?
2. what requirement exists because of it?
3. what evidence is missing/failed?
4. what exact action can the user take next?

---

# Part V — UX that wins adoption

## 20. Information architecture

Primary navigation should remain close to:

1. **Overview**
2. **Gates**
3. **Repositories**
4. **Receipts**
5. **Workspace**
6. **Discoveries** (secondary / preview until the Gate wedge is proven)

Do not lead with internal ontology such as Cases, Claims, Genome, Loops, or Experiments. Those may remain internal architecture or advanced research tools.

### Overview

Answer: “What needs my attention?”

Show:

- active blocked candidates
- releases awaiting approval
- recent semantic authority expansions
- latest receipts
- high-risk changes
- integration status

### Gates

This is the hero product screen.

A gate detail page should make the trust story obvious:

- candidate / exact artifact hash
- previous trusted ancestor
- semantic capability diff
- compiled requirements
- why each requirement exists
- current evidence state
- source and independence of each evidence item
- human approval requirement
- signed final receipt

### Repositories

Show lineage and trusted versions. Over time, make it visually clear which releases are ancestors, blocked branches, and superseded versions.

### Receipts

Portable, exportable, searchable, independently verifiable.

### Workspace

Members, roles, organization policy packs, API tokens, trusted verifier identities, signing/key status, SSO/security configuration, audit events.

### Discoveries

Keep this coherent with the Gate object model, but do not let it distract from the first commercial job until customers demonstrate repeated discovery lineage usage.

## 21. The 10-minute promise

This should be a measured product KPI, not a slogan.

> **A competent DevOps/AI engineer should go from an existing repository to the first meaningful HodgeForm gate in under 10 minutes.**

And:

> **At least 80% of ordinary onboarding cases should require fewer than 10 manually authored policy lines.**

A target flow:

1. Sign in / join workspace.
2. Create API token.
3. Install CLI.
4. Run `hodgeform init`.
5. CLI scans artifact and recommends pack.
6. User confirms minimal intent.
7. Candidate is submitted and exact gate is frozen.
8. HodgeForm tells user exactly which verifier evidence is needed.
9. CI runs or templates are generated.
10. Reviewer approves exact gate; CI verifies receipt.

### Onboarding should produce value even when it blocks

The first meaningful outcome does not have to be RELEASE. A useful first experience may be:

> “Your agent gained shell execution. HodgeForm found the change and blocked release because isolation evidence is missing.”

That is product value.

### Future onboarding accelerators

- generated GitHub Actions / GitLab snippets
- framework-aware adapter suggestions
- one-click standard verifier packs
- repo scanner that explains detections
- sample evidence fixtures
- safe organization policy templates
- dry-run mode before enforcement

Never make “dry-run” silently count as release approval.

---

# Part VI — Technical architecture and production requirements

## 22. Current architecture map

The current canonical repository is a TypeScript/React/TanStack Start application with a deterministic gate core, Postgres/PGlite persistence, Better Auth, CLI/API surface, Ed25519 receipts, optional local-model proposals, and an isolated Python executor.

Key paths:

### Product UI

- `src/components/app-shell.tsx`
- `src/routes/index.tsx`
- `src/routes/gates.tsx`
- `src/routes/repositories.tsx`
- `src/routes/receipts.tsx`
- `src/routes/workspace.tsx`
- `src/routes/discoveries.tsx`
- `src/styles.css`

### Trust compiler / release logic

- `src/lib/gate/policy.ts`
- `src/lib/gate/types.ts`
- `src/lib/gate/crypto.server.ts`
- `src/lib/gate/config.server.ts`
- `src/lib/gate/authorization.ts`
- server/API modules under `src/lib/gate/`

### Tenant / workspace / auth

- `src/lib/gate/tenant.server.ts`
- `src/lib/gate/api-keys.server.ts`
- `src/lib/auth/`
- `migrations/0001_auth.sql`
- `migrations/0003_api_tokens.sql`
- `migrations/0004_workspaces.sql`

### Persistence

- `src/lib/db.ts`
- `migrations/0002_gate.sql`
- `scripts/migrate.mjs`

### CLI / CI

- `bin/hodgeform.mjs`

### Runtime helpers

- `src/lib/runtime/model-provider.server.ts`
- `src/lib/runtime/sandbox.server.ts`
- `executor/server.py`
- `executor/Dockerfile`

### Deployment

- `Dockerfile`
- `docker-compose.production.yml`
- `docker-compose.local.yml`
- `Caddyfile`
- `.env.production.example`
- `.github/workflows/release.yml`

### Existing design docs

- `README.md`
- `SECURITY.md`
- `RELEASE_STATUS.md`
- `docs/POLICY_PACKS.md`
- `docs/VERIFIER_SDK.md`
- `docs/DISCOVERY_MODEL.md`
- `docs/SELF_AUDIT.md`

## 23. Database stance

Production must use standard managed Postgres through `DATABASE_URL`. PGlite is a local/test convenience and should never become an accidental production dependency.

`src/lib/db.ts` already routes to a normal `pg` pool when `DATABASE_URL` is configured and supports pooled transactions. The next production owner must prove this path against a normal managed Postgres deployment, not merely inspect the code.

### Required pre-GA database validation

- migration from clean database
- migration upgrade from prior schema where applicable
- transaction rollback behavior
- concurrent candidate/release decisions
- workspace tenant isolation integration tests
- connection pool sizing and failure behavior
- backup/restore drill
- point-in-time recovery assumptions documented
- production TLS DB connection configuration
- database credential rotation procedure
- retention/deletion policy

## 24. Production security checklist

Before broad public release, the next owner must complete or explicitly scope each item.

### Application / identity

- verified email for public signup
- password reset/recovery tested
- abuse/rate limiting tested
- role escalation tests
- invitation expiry/revocation
- last-owner protection
- API token rotation/revocation
- API tokens scoped to current workspace membership
- session expiration strategy
- MFA strategy
- enterprise SSO/SAML/OIDC path for design partners
- audit log for high-impact admin actions

### Release authority

- Ed25519 keypair consistency check
- private key in secret manager/HSM-compatible path, not source or image
- independently distributed public key to CI
- key rotation procedure
- dual-key overlap strategy during rotation
- signer ID/fingerprint audit
- receipt schema versioning policy

### Tenant/data isolation

- integration tests against real Postgres
- authorization checks at every object fetch/mutation
- no user-controlled tenant ID without membership verification
- secure logs that do not leak secrets/evidence payloads
- data retention/deletion controls
- customer export capability

### Executor

- no direct arbitrary code spawn in web process
- no standing cloud credentials in executor
- network policy explicitly disabled/restricted
- resource limits
- read-only base FS
- per-job ephemeral workspace
- hostile multi-tenant code should move to disposable hardened containers or microVMs
- executor service authentication for remotely hosted variants

### Supply chain

- clean `npm ci`
- `npm audit --omit=dev --audit-level=high`
- TypeScript typecheck
- ESLint
- deterministic tests
- production build
- container build
- container vulnerability scan
- SBOM generation recommended
- signed release artifacts recommended
- dependency update/triage process

### Public operations

- security contact
- vulnerability disclosure policy
- privacy policy
- terms appropriate to service
- incident response runbook
- alerting/monitoring
- backup/restore test
- logging and retention policy
- uptime/error budgets for pilot contracts
- no compliance certifications claimed until actually obtained

### External security review

Before storing materially sensitive enterprise data at scale, conduct a deployment-specific penetration test. For regulated customers, map controls to the applicable framework rather than assuming product architecture equals compliance.

## 25. Current verified truth vs. remaining production evidence

At the time of the current snapshot:

### Verified in the local build session

- `62/62` deterministic product/security tests passed in the local finalization environment before the 1.1 package pass
- semantic capability expansion tests
- LLM non-authority tests
- fail-closed capability inventory tests
- four-eyes approval invariants
- workspace role and last-owner rules
- API token non-approval / tenant checks
- signed receipt tamper/BLOCK rejection
- signing key consistency checks
- Python executor syntax compilation
- Compose parsing during packaging

### Not yet validly claimed by the current snapshot

The prior inspection environment could not complete a clean dependency-backed build because npm registry DNS resolution failed. Therefore public GA still requires a green external CI run of:

1. `npm ci`
2. production dependency audit
3. `npm run release:check`
4. Python compile
5. production Compose validation
6. production Docker build

The repository already encodes these gates. Do not remove them to get a green badge.

### Product evidence still needed

Code correctness alone does not prove market fit. The next phase must also prove:

- onboarding under 10 minutes
- low manual policy authoring
- acceptable gate latency
- managed Postgres operational stability
- design partner willingness to enforce the gate, not merely observe it
- willingness to pay

---

# Part VII — Commercial strategy

## 26. First market

Initial target customers should be teams that already have consequential AI agents moving toward production.

Do not target “people interested in AI safety.” Target people with an imminent release problem.

Recommended economic buyer:

> **Head / VP of AI Platform or AI Engineering**

Recommended co-buyer/veto:

> **CISO / AppSec / AI Security / Model Risk**

Recommended design-partner profile:

- meaningful AI agent program
- agents with tools/side effects, not just chat
- existing CI/CD discipline
- security/governance pressure
- willingness to use private/self-hosted deployment if needed
- ability to identify a real candidate agent for a pilot

## 27. First 15 enterprise design partners

The next operating goal should be 15 qualified teams, not 15 friendly AI enthusiasts.

A strong pilot:

- 4–6 weeks
- 1–3 real agents
- baseline current release process
- HodgeForm integrated into actual CI or a pre-production mirror
- at least one deliberately introduced capability change
- evidence requirements configured before result observation
- one real reviewer workflow
- signed receipt consumed by CI

### Pilot metrics

- time to first meaningful gate
- manually authored policy lines
- median HodgeForm-added decision latency excluding long-running customer test suites
- number of semantic authority expansions detected
- number of missing controls discovered before release
- number of false-positive/unhelpful blocks
- number of attempted/accidental bypass paths
- developer satisfaction
- reviewer time per release
- paid conversion / expansion intent

### Commercial hypothesis, not validated fact

Private/self-hosted enterprise contracts can plausibly support substantial annual contract values. Earlier strategy discussions used roughly `$50k–$150k+` as an initial hypothesis for enterprise use. Treat that as a pricing hypothesis to test, not as booked or validated revenue.

A paid design-partner motion is preferable to free pilots because willingness to pay is itself evidence.

## 28. Distribution

Do not compete for dashboard time.

Distribution surfaces:

- CLI
- CI actions/templates
- GitHub/GitLab/Jenkins integrations
- API
- verifier SDK
- signed receipt verification library
- future deployment admission controller

The web product exists for human review, policy administration, lineage, evidence exploration, and audit—not because every CI step must happen in a dashboard.

### Recommended openness strategy

Strongly consider keeping the **receipt schema, verifier/CLI interfaces, and offline verification path open and inspectable**, while monetizing hosted/private control plane, policy management, enterprise identity, verifier governance, analytics, and accumulated policy intelligence.

This is a strategic recommendation, not a settled licensing decision. The trust protocol becomes more credible if customers can independently verify its outputs without trusting proprietary UI code.

---

# Part VIII — The moat

## 29. What is easy to copy

Competitors can copy:

- an approval button
- SHA-256 hashes
- a dark dashboard
- “AI safety” copy
- Docker sandboxing
- a basic policy YAML
- an LLM judge

None of those is the durable moat.

## 30. What can compound

The durable advantage can become the system that understands the relationship:

> **change in machine authority → required evidence → observed failures → verifier reliability → human decision → production outcome**

Over time, HodgeForm can accumulate:

- semantic capability-change taxonomy
- policy pack evolution
- evidence/admissibility patterns
- real failure families
- reusable counterexamples
- verifier performance histories
- false-positive/false-negative evidence
- release ancestry
- incident linkage
- organization-level trust requirements
- refuted improvement candidates

That graph can answer questions a normal CI system cannot:

> Which kinds of authority changes historically predict incidents?

> Which verifier classes catch failures before production?

> Which policy requirements create friction without predictive value?

> What evidence was sufficient for the last ten payment-capable agent releases?

> Which trusted release introduced this capability?

The moat is not the ledger alone. It is **high-quality structured trust history plus distribution inside real release pipelines**.

## 31. HodgeForm governing HodgeForm

This should continue carefully.

Current dogfooding includes:

- General Problem Loop: `problem_loop_3520b8740a5a4ce0` for release self-audit
- enterprise pilot readiness loop: `problem_loop_42387bf3db614db2`
- governed onboarding/product-friction improvement candidate: `improvement_candidate_1013f9d3daf64f8b`
- provenance-bound capability verifier improvement candidate: `improvement_candidate_37076b7a8d424ee7`

The important behavior is not the IDs. It is the discipline:

- freeze criteria before observing results
- preserve failed checks
- keep improvement proposals inactive until separately evaluated
- do not allow the system to self-deploy because it “survived” its own tests
- distinguish deterministic integrity from universal truth

This can eventually become a powerful trust story: customers can inspect not only release receipts but the evolution history of the policy machinery that issued them.

Never market that as “HodgeForm proves HodgeForm is safe.” It is better described as **governed provenance for changes to the trust system itself**.

---

# Part IX — Long-term platform: Git for AI-generated knowledge

## 32. Why Discovery belongs, but not on day one

The Gate and Discovery products share the same state transition.

Agent release:

```text
candidate agent -> frozen gate -> evidence -> approval -> RELEASE/BLOCK
```

Discovery promotion:

```text
candidate claim -> frozen verification plan -> evidence/falsification -> review -> TRUST/REFUTE
```

The deeper platform can support:

- discovery commits
- branches / competing hypotheses
- forks / independent replication
- merges / synthesis
- supersession
- trusted tags/releases
- claim blame/history
- contradictory evidence
- exact model/data/code/environment provenance

The powerful long-term idea is a machine-readable graph of:

> what was tried, what failed, what survived, what evidence supported it, and why it became trusted.

## 33. Discovery anti-cold-start strategy

Do not launch a public social network for science before private repositories prove repeated value.

Start with:

- computational research teams
- autonomous research-agent builders
- AI-for-science groups
- private R&D repositories

Integrate with existing ELN/LIMS/artifact systems rather than trying to replace them.

Only pursue public forks/reputation/network effects after real users repeatedly branch, replicate, supersede, and promote discovery objects.

Network effects are a future hypothesis, not a current valuation claim.

---

# Part X — What not to build

## 34. Anti-goals

A successor will be tempted to expand scope. Resist the following unless new customer evidence explicitly changes the strategy.

### Do not become a generic agent framework

Customers should keep LangGraph, Claude/Codex, MCP, custom agents, or whatever stack they use.

### Do not become generic observability

Integrate with observability vendors. Own the trust transition.

### Do not build chat as the center of the product

AI can assist the workflow, but chat is not the product primitive.

### Do not make a single opaque trust score

A red/yellow/green state can summarize, but it must always decompose into exact requirements and evidence.

### Do not make LLM-as-judge the release authority

This destroys the category thesis.

### Do not expose a public arbitrary-code runner from the web app

Hostile code requires isolated/disposable execution architecture and its own threat model.

### Do not claim compliance automatically

HodgeForm can provide controls/evidence useful to compliance. It does not magically confer SOC 2, HIPAA, PCI, FedRAMP, or any legal status.

### Do not invent proprietary standards where interoperable standards work

Use open attestation/provenance patterns where they strengthen adoption.

### Do not build the public discovery network before private usage proves the behavior

Do not confuse ambition with sequencing.

### Do not weaken policy to make onboarding easier

Improve policy compilation, templates, diagnostics, and automation instead.

---

# Part XI — The production completion plan

## 35. P0: required before a credible public beta / first serious design partners

### Build and dependency evidence

- get external CI green on the exact canonical commit
- real `npm ci`
- typecheck
- lint
- deterministic tests
- production build
- Docker build
- dependency/container scan

### Managed Postgres

- run migrations on real managed Postgres
- add integration tests for workspace isolation and release transaction races
- validate backup/restore

### Identity / team operations

- production email verification and reset
- invitations and revocation UX hardened
- role-change audit events
- API token lifecycle UX
- MFA/SSO plan; SSO likely required for enterprise pilots even if public beta starts without full SCIM

### Signing operations

- secret-manager deployment
- key rotation runbook and test
- separate public-key distribution path

### Observability

- structured server logs
- release decision audit events
- metrics for gate latency and failure reasons
- alerting for signing/config/auth failures
- no sensitive payload leakage in logs

### Onboarding benchmark

Recruit at least five developers unfamiliar with the codebase and measure:

- time to first gate
- policy lines authored
- confusion points
- time to understand a BLOCK

Do not count the founder or product author as onboarding evidence.

### Security

- threat-model review
- pentest before broad sensitive-data use
- security contact / vulnerability disclosure
- rate-limit and tenant-bypass testing

## 36. P1: enterprise pilot excellence

- GitHub Action / reusable workflow
- GitLab/Jenkins examples
- executor interface with measured latency
- trusted verifier registration
- signed provenance-bound verifier attestation
- SSO/SAML/OIDC enterprise support
- richer organization policy administration
- immutable audit export
- receipt bundle export
- configurable retention
- verifier SDK package
- policy-pack version/diff UI
- policy upgrade simulation (“what would v2 require?”)
- key rotation UI/ops support
- deployment runbook for RDS/Aurora and private VPC

## 37. P2: compounding platform

- capability ontology with parameters/scopes
- release ancestry and incident correlation
- verifier reputation/effectiveness analytics
- policy recommendation learned from aggregated *privacy-preserving* evidence, never silently authoritative
- discovery commit/branch/merge workflows
- standard provenance export/import
- private federation across business units
- eventual public discovery network only if usage proves the value

---

# Part XII — Performance and operational KPIs

## 38. Product KPIs

### Adoption

- time to first meaningful gate < 10 minutes
- < 10 manually authored policy lines for 80% of standard cases
- integration completion rate
- percentage of users who enforce rather than dry-run

### Developer experience

- median gate orchestration overhead excluding customer test runtime
- time to diagnose a block
- false-positive / waived requirement rate
- bypass attempts or emergency overrides

### Trust quality

- consequential capability expansions detected
- missing-control discoveries before production
- production incidents linked to previously satisfied/unsatisfied requirements
- verifier predictive performance
- percentage of releases with independent evidence when required

### Commercial

- qualified design partners
- paid pilot conversion
- time from technical validation to security approval
- expansion from one agent/team to multiple
- retention tied to release workflow usage

## 39. Latency budget

Do not optimize blindly.

Instrument separate phases:

1. artifact scan/hash
2. policy compilation
3. database/evidence evaluation
4. verifier queue
5. verifier execution
6. model-assisted red team
7. human waiting time
8. receipt signing/verification

Policy compilation and receipt signing should be effectively negligible relative to real tests. The goal is not “every gate completes in under one second”; the goal is that **HodgeForm itself does not add unnecessary delay** and fast deterministic gates stay fast.

---

# Part XIII — Definition of done

## 40. Public beta definition

HodgeForm can be called a credible public beta when:

- canonical CI is green on exact source
- production Postgres path is proven
- signing/key path is operationally tested
- auth/recovery/public signup path is tested
- tenant-isolation integration tests pass
- security disclosure/contact exist
- onboarding is measured with external users
- CLI/CI path is documented and works
- the product makes no unsupported compliance/safety claims
- known limitations are public enough for the intended customer risk

## 41. Enterprise GA definition

Enterprise GA should additionally require:

- deployment-specific security review / penetration testing
- SSO path acceptable to target customers
- backup/restore drills
- key rotation drills
- incident response process
- monitoring/SLAs appropriate to contract
- production multi-tenant executor threat model resolved for any hostile-code features offered
- successful real design-partner use in enforced mode
- evidence that the product meaningfully improves a release-control outcome

## 42. Company-level proof points before calling the category won

The category thesis becomes significantly stronger when HodgeForm can show:

- multiple unrelated enterprises use the same core trust model
- semantic capability changes repeatedly discover controls teams would otherwise miss
- developers adopt without writing complex policy
- security teams accept HodgeForm receipts as meaningful release evidence
- HodgeForm sits in enforced CI/CD, not only dashboards
- customers expand across agents/teams
- accumulated evidence improves policy/verifier quality without turning models into authority

---

# Part XIV — How to work on HodgeForm

## 43. Handoff operating instructions

A successor should follow this order.

### First 48 hours

1. Read this manifesto, `README.md`, `SECURITY.md`, and `RELEASE_STATUS.md`.
2. Verify the latest source archive checksum.
3. Run the entire external CI/release workflow in a network-enabled environment.
4. Do not redesign the UI or architecture before understanding which checks fail.
5. Stand up production-mode Postgres locally or in a disposable managed environment.
6. Walk the CLI golden path from a fresh sample agent.
7. Attempt to bypass tenant, approval, artifact hash, evidence, and signature boundaries.

### First week

1. Fix all P0 release evidence gaps.
2. Add instrumentation for gate latency.
3. Run five unfamiliar-user onboarding sessions.
4. Produce one polished design-partner deployment runbook.
5. Create one canonical GitHub Actions integration.
6. Run a workspace/multi-user high-risk release end to end.
7. Verify signing-key rotation procedure.

### First month

1. Put HodgeForm into a real pilot pipeline.
2. Record real friction and failure evidence.
3. Improve policy packs based on observed workflow, not founder imagination.
4. Build provenance-bound verifier attestations if customer threat models justify them.
5. Do not begin a broad discovery-network build unless Gate pilots independently reveal discovery-lineage demand.

## 44. How to decide whether a change is good

A feature is good when it does at least one of the following without weakening the constitution:

- reduces time to trustworthy release
- improves evidence quality/provenance
- detects meaningful semantic authority changes
- reduces policy-authoring burden
- strengthens independent verification
- makes BLOCK states easier to resolve
- improves auditability
- reduces deployment/integration friction
- creates reusable, structured trust history

A feature is suspicious when it mainly:

- adds dashboard surface area
- adds AI-generated prose without new evidence
- hides complexity rather than removing it
- produces a new score that cannot be traced to requirements
- broadens the market story without new customer evidence
- weakens separation of duties for convenience

## 45. HodgeForm method for HodgeForm changes

For changes to trust-critical components, use a discipline like:

```text
goal -> representation -> frozen plan -> execution -> observation -> falsification -> diagnosis -> repair -> independent review -> release
```

If the @HodgeForm governed tools are available, use them where they add traceability. If they are not available, preserve the same spirit in repository artifacts and tests.

Do not allow any automated self-improvement loop to directly deploy trust-engine changes.

---

# Part XV — Glossary

## 46. Key terms

**Artifact** — exact bytes/object being evaluated for trust transition.

**Candidate** — a proposed version/change bound to an artifact and manifest.

**Capability** — consequential authority available to the candidate.

**Semantic diff** — change in authority/behavioral capability, not merely source text.

**Policy intent** — small human-facing configuration used as input to the compiler.

**Compiled policy / gate plan** — frozen authoritative set of evidence obligations.

**Requirement / obligation** — one condition that must be evidenced.

**Evidence** — typed scoped observation/receipt supporting or refuting a requirement.

**Admissibility** — whether an evidence kind/independence level is allowed to satisfy a requirement.

**Falsifier / counterexample** — evidence that refutes a release assumption or requirement.

**Four-eyes approval** — creator and approver must be distinct.

**Release authority** — deterministic service/logic that decides whether configured requirements and approval are satisfied and signs the result.

**Receipt** — signed portable attestation of exact candidate, policy, evidence snapshot, approval, and verdict.

**Discovery commit** — content-addressed machine/human-generated knowledge object with lineage and evidence.

**Trusted** — promoted under a configured process; never synonymous with universally true/safe.

---

# Part XVI — Final manifesto

## 47. What HodgeForm should become

AI systems will increasingly write code, operate software, move money, communicate with customers, conduct research, and create knowledge that people act upon. The world will need more than logs of what those systems said. It will need trustworthy history around **why their outputs and actions were allowed to become authoritative**.

HodgeForm should build that history.

The opportunity is not to promise that AI can be made infallible. The opportunity is to make trust transitions explicit, inspectable, reproducible, and enforceable.

A machine can propose.

A model can criticize.

A verifier can measure.

A human can authorize.

But none of those actors should be able to rewrite the rules after seeing the outcome or silently substitute one kind of evidence for another.

That is the epistemic boundary.

The best HodgeForm product will feel simple to a developer because the complexity is compiled away. It will feel rigorous to a CISO because the authority is deterministic. It will feel useful to an auditor because the evidence is preserved. It will feel flexible to an AI builder because HodgeForm does not demand that they abandon their framework. And it will become more valuable over time because every real release contributes structured history about what changed, what was tested, what failed, and what ultimately earned trust.

The company should be ambitious about the category but disciplined about the wedge.

First, become the release gate that consequential AI teams actually enforce.

Then become the repository where trustworthy AI work has lineage.

Then, if usage earns the right, become the version-control and trust layer for machine-generated discovery itself.

The product should always be able to answer one question with unusual precision:

> **Why did we trust this exact thing?**

If HodgeForm can make that answer cheap to produce, hard to forge, easy to verify, and useful across organizations, it will have created infrastructure that did not exist before.

And if a future engineer, designer, founder, or AI agent picks up this repository, their job is not to preserve every implementation detail in this snapshot.

Their job is to preserve the boundary, simplify the experience, deepen the evidence, prove the value with real users, and make HodgeForm increasingly difficult to live without for anyone shipping consequential machine-generated work.

> **Trust what ships. Preserve why.**

---

## Appendix A — Absolute non-negotiables for any successor

1. Never let an LLM `PASS` become sole release authority.
2. Never accept a different artifact than the one that was tested.
3. Never let the candidate author silently rewrite the frozen gate after results exist.
4. Never convert missing evidence into success.
5. Never let a CI token impersonate required human approval.
6. Never let high-risk creator/approver separation disappear for convenience.
7. Never treat a receipt as universal safety/compliance proof.
8. Never let caller-provided labels create “formal proof” or “independent verifier” status without verifier identity/provenance.
9. Never expose hostile arbitrary code inside the web process.
10. Never claim a build/test/security property that was not actually verified on the exact release artifact.
11. Never hide failed experiments or refuted improvement candidates simply because they weaken the narrative.
12. Never allow the long-term Discovery vision to distract from proving Gate adoption first.

## Appendix B — Recommended primary messages

### Homepage

**Trust what ships.**

Git tells you what changed. HodgeForm determines what evidence that change requires before consequential AI work can become trusted.

### Product

**HodgeForm Gate**  
Freeze the exact artifact. Compile the evidence standard. Block what cannot prove it. Sign what survives.

### Developer

**Add evidence-gated releases to the CI you already use.**

### Security

**Deterministic release authority. Probabilistic models never certify themselves.**

### Investor

**Semantic change control and a trust ledger for machine-generated work.**

### Long-term

**Git gave software a history. HodgeForm gives machine-generated work a trustworthy one.**

