# Verifier integration contract

HodgeForm 1.1 accepts evidence through the authenticated candidate evidence endpoint. A verifier should:

1. Receive the exact candidate ID, artifact digest, frozen policy hash, and target requirement ID.
2. Run without modifying the frozen policy.
3. Produce a bounded result (`pass`, `fail`, or `inconclusive`) plus structured details and artifact/output digests.
4. Submit the result using a workspace-scoped CI token.
5. Preserve failures and counterexamples; do not retry past the verifier's declared budget without generating a new evidence item.

Evidence kinds include deterministic tests, static analysis, sandbox runs, LLM evaluations, and independent verifier results. HodgeForm computes independence from authenticated identity rather than trusting a caller-provided independence label.

`formal_proof` is intentionally not accepted through the generic endpoint. A future proof adapter must verify a proof/checker receipt before that status can be admitted.

LLM evaluators may submit `fail` counterexamples, but an LLM `pass` never independently satisfies a blocking requirement.


## Verifier identity in 1.1

Independent status is no longer inferred merely because a different user submitted an `independent_verifier` label. Register a verifier principal in HodgeForm, bind a machine token to it, and give that token only the scopes it needs. The evidence endpoint derives the principal/trust level from authentication and server-binds every receipt to the exact candidate artifact, policy hash, and requirement before hashing it. See `docs/VERIFIER_REGISTRY.md`.
