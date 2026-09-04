# Verifier registry and machine evidence identity

The verifier registry makes evidence independence an authenticated property instead of a text label.

## Trust levels

- `same_team` — a registered machine verifier operated inside the release team's trust boundary.
- `independent` — a verifier the workspace administrator explicitly designates as organizationally independent for the configured evidence scope.

`formal` remains reserved for a future proof/checker adapter that verifies a machine-checkable proof receipt. Generic API submission cannot self-assert formal proof status.

## Token binding

A machine token can optionally be bound to one verifier principal. Token scopes are explicit:

- `repository:read`
- `repository:write`
- `candidate:read`
- `candidate:write`
- `evidence:write`
- `receipt:read`

There is intentionally no `release:approve` scope.

When a verifier-bound token submits evidence, HodgeForm:

1. authenticates the token and workspace;
2. verifies the principal is active;
3. checks that the principal is registered for the submitted evidence kind;
4. derives the evidence independence from the principal;
5. binds the evidence to the exact candidate/artifact/policy/requirement;
6. hashes and appends the evidence receipt.

For an `independent_verifier` evidence kind, HodgeForm requires an active principal with `independent` trust. A different human account in the same workspace is only `same_team`; it does not magically become an independent verifier.

## Operational note

The trust-level designation is an organizational governance assertion, not proof that two companies or infrastructures are economically independent. Enterprise deployments should document the basis for an `independent` designation and audit changes to the verifier registry.
