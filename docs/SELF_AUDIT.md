# HodgeForm self-audit / dogfooding record

HodgeForm 1.1 is being built using HodgeForm's governed machinery as an additional engineering control. This is not a claim that the product can certify itself safe. The point is to make our own changes subject to the same **freeze → observe → falsify → preserve limitations** discipline that the commercial product is designed to enforce.

## Release problem loop

Build-session General Problem Loop: `problem_loop_3520b8740a5a4ce0`.

The loop froze release success criteria and anti-rescue rules before the remaining checks. In particular, it forbids weakening four-eyes approval, evidence independence, signing, tenant isolation, or fail-closed production configuration merely to make a release pass. It also records the unavailable dependency-backed build as an environmental blocker rather than silently treating syntax checks as a build pass.

The loop is append-only/hash-chained in the operator's HodgeForm instance and has **no deployment or activation authority**.

## Governed product-friction improvement

Candidate: `improvement_candidate_1013f9d3daf64f8b`  
Candidate hash: `0ad2454d2380c726895cfc7a6979ce51d810e0f12924031ff8385ec315fee3ba`

This candidate proposed deterministic auto policy-pack recommendation plus CI receipt retrieval while retaining the server compiler and separate human approval boundary. Its evaluation was frozen before results:

- plan: `improvement_plan_7d97d73c009b4010`
- plan hash: `d8a5c15616373b93e2bfd433e82557eb40a2257888913a6ca368d451fab261db`
- evaluation: `improvement_evaluation_cc7a289b0cf94f22`
- evaluation hash: `17498bf06fa79c8ecdf2387da2b46a08d8a1320ffa16def9eeeb66464af4c786`
- bounded verdict: `survived`

A survivor is not universal proof. HodgeForm's governed-improvement registry also cannot activate the candidate by itself.

## Preserved verifier limitation

Candidate: `improvement_candidate_37076b7a8d424ee7`  
Candidate hash: `a258c67f7f587c8bdd72b82c476ad1465ade3122b73e975cc263f200fc8edd9f`

The v1 capability scanner is deterministic, authenticated, fail-closed and artifact-hash-bound, but its execution is still performed by the CI client. A compromised CI principal could fabricate the payload. Rather than calling that independent evidence, HodgeForm records a prospective **provenance-bound capability verifier v2** candidate.

Its frozen prospective evaluation plan is:

- plan: `improvement_plan_a00c387659e44bd1`
- plan hash: `ffde256ce679c1f8c58a79638390d883ee355a7e2460edda90e43a7f98958bf4`

The proposed direction is a trusted signed verifier attestation (preferably interoperable with standard attestation envelopes) or server-isolated scan receipt whose subject is the exact frozen artifact digest. It remains **inactive and unevaluated**.

## Why this matters competitively

A competitor can copy an approval button or a SHA-256 field. The harder behavior to reproduce is a system that also keeps its own policy/verifier evolution as frozen, falsifiable, append-only candidate history; preserves refutations and known limitations; and refuses to turn an evaluator's confidence into activation authority. HodgeForm is dogfooding that behavior now, but customer evidence is still required before treating it as a durable commercial moat.
