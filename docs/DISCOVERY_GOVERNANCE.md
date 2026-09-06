# Discovery workflow and evidence boundaries

The Discoveries page preserves proposed claims, operators, experiments, and refutations as immutable commits. Choose a repository, optionally choose a parent from that repository, and write a bounded claim. Research prompts help structure the draft. They do not execute a search, run a proof checker, freeze an external experiment, or certify the claim.

Evidence receipt IDs must exist in the current workspace and repository. The server rejects missing, duplicate, foreign-workspace, and foreign-repository references. Citing evidence records provenance; a citation does not imply that the evidence passed, independently supports the claim, or satisfies a release requirement. Discovery commits remain `proposed`. Release candidates still follow the separate policy, evidence, approval, and signed-receipt lifecycle.

## Research patterns

1. **Diagnose a representation limit.** Freeze the available observations, operations, and target. Look for cases with identical available observations and different targets. Record the cases, arithmetic/measurement assumptions, and scope. A failed search or exhausted budget alone is not evidence of impossibility. A finite witness establishes a limit only for the specified representation and cases; a language-wide theorem requires a checked argument about every permitted operation and composition.
2. **Propose an operator.** State the missing observable, primitive, or memory update and competing explanations. Freeze the baseline, budgets, fresh data, success threshold, per-case regression constraints, and kill-switch/ablation before evaluating it. A successful extension on inspected cases remains exploratory. Any new execution or data-access permission must enter the release candidate's capability inventory and policy.
3. **Plan an experiment.** Record artifact, protocol, dataset, evaluator, and freeze hashes with the actual freeze authority. Distinguish a local file hash from an accepted server freeze. Preserve null controls, dependence groups, stopping criteria, missing runs, and independent verification. Do not reuse an inspected holdout as a fresh confirmatory test.
4. **Preserve a refutation.** Link the failed parent and its original criterion. Separate counterexamples, insufficient evidence, and implementation errors. A smaller positive effect or successful secondary analysis does not rescue a failed primary. Make a narrower claim in a new commit and test it prospectively.

When multiple operators explain the observations, retain them as alternatives. Prefer a discriminating intervention over selecting the first match. Structural retention of functions or branches does not establish behavioral non-regression.

## Integrating external discovery or proof engines

The current application does not embed an autonomous grammar synthesizer, Lean kernel, or general scientific-discovery runtime. An external engine can submit its exact artifact and typed evidence through the existing candidate/evidence API. It receives no release authority merely by producing a certificate-shaped JSON document.

A production adapter must bind the candidate artifact, frozen representation, case set, protocol, verifier version, and proof/source hashes. It must check the claimed scope, reject unknown schemas and altered hashes, preserve failed verification attempts, and use a separately configured verifier identity. Execute proof checkers or generated code only in bounded disposable workers without application secrets or ambient network access. LLM-generated proposals and self-reported PASS results cannot satisfy independent blocking requirements.

Before enabling such an adapter, verify tamper rejection, cross-workspace isolation, bounded resource use, verifier credential scope, reproducibility, and failure behavior. A valid proof about a finite representation does not establish real-world data validity, scientific novelty, generalization, or universal safety.
