# HodgeForm Trust Transition Protocol

HodgeForm governs one thing: a proposed change in trusted state.

For every release candidate the product must answer, from frozen server state:

1. **What changed?** The exact artifact digest and semantic authority delta.
2. **What must be proven?** The immutable set of blocking obligations compiled from policy packs, organization overlays, data class, current capabilities, and newly introduced authority.
3. **What evidence counts?** Typed evidence whose provenance and independence meet the requirement's admissibility rule.
4. **Who may authorize the transition?** An authenticated human with the required workspace role, separate from the creator when the risk policy requires it.

The canonical flow is:

```text
exact artifact
  -> semantic authority diff
  -> frozen gate plan
  -> typed, bound evidence receipts
  -> deterministic obligation evaluation
  -> human authorization boundary
  -> signed RELEASE / BLOCK receipt
```

## Non-compensatory evidence

Evidence is not a pile of scores. Each requirement declares the evidence kinds and minimum independence that are eligible to establish it.

An LLM `PASS` never independently satisfies a blocking obligation. An LLM `FAIL` or counterexample may block an obligation when the LLM evidence kind is admissible for that requirement. Missing proof remains missing regardless of confidence scores elsewhere.

## Evidence binding

Every evidence receipt recorded by HodgeForm is server-bound before hashing to:

- candidate ID;
- exact artifact SHA-256;
- frozen policy hash;
- requirement ID;
- authenticated verifier principal, when present;
- machine-token identity, when present.

This prevents an old result from silently becoming proof for a different artifact, policy, or requirement.

## Independent verification

`independent_verifier` is not a caller-selectable trust claim. The workspace registers a verifier principal with a trust level and allowed evidence kinds, then issues a scoped API token bound to that principal. HodgeForm derives independence from the authenticated token/principal relationship.

Disabling a verifier revokes its bound machine tokens. Historical evidence remains append-only and retains the verifier identity under which it was admitted.

## Release authority boundary

Machine tokens may submit candidates and evidence and may fetch receipts according to their scopes. There is no machine-token scope for human release approval.

High/critical risk release approval is role-gated and requires a different person from the candidate creator. The release decision is finalized transactionally and signed by the deployment's release-authority Ed25519 key.

## Receipt meaning

A HodgeForm receipt never claims universal safety. It records that an exact artifact satisfied an exact frozen gate with an exact evidence record and an exact authorized decision.
