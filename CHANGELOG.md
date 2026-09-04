# Changelog

## 1.1.0 — Trust Compiler

This release sharpens HodgeForm around the product's core epistemic boundary rather than adding general AI features.

### Added

- Registered verifier principals with `same_team` and `independent` trust levels.
- Verifier-bound, scope-limited API tokens.
- Server-generated evidence bindings to candidate/artifact/policy/requirement/verifier/token identity.
- First-class Trust Transition summary in the candidate API and Gate UI.
- Public `PRODUCT_CONSTITUTION.md` and Trust Protocol documentation.
- `hodgeform gate explain <candidate-id>`.
- `hodgeform demo` with the canonical four bypass attempts.
- `hodgeform benchmark` and TrustBench 0.1 fixtures.
- Regression tests for verifier identity, evidence binding, token scopes, trust-transition UX, demo, and benchmark behavior.

### Tightened

- `independent_verifier` evidence is no longer inferred from “different user”; it requires an authenticated registered independent verifier principal.
- Browser evidence entry no longer allows users to self-submit evidence kinds whose trust status requires a registered verifier/proof adapter.
- Production/source tree wording and release identity updated to 1.1.0.

### Preserved

- LLM PASS remains non-authoritative for blocking obligations.
- Counterexamples may still fail an admissible obligation.
- High/critical-risk four-eyes approval remains mandatory.
- Release finalization remains transactional and server-authoritative.
- CI verifies Ed25519 receipts against a separately pinned public key.
- No CI/API token endpoint can cross the human release-approval boundary.
