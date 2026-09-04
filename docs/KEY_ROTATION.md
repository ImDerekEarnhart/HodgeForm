# Release-authority key operations

HodgeForm uses Ed25519 to sign release receipts. The private key is release-authority material and must not be committed to source control, embedded in images, or returned in receipts.

## Bootstrap

Generate keys on an administrative machine or HSM/KMS-backed process:

```sh
hodgeform keys generate --out-dir .hodgeform/keys
```

Provision the private key only to the release-authority runtime. Distribute/pin the public key to CI through a separate trusted channel. Record its fingerprint in change-control records.

## Rotation

1. Generate a new keypair and fingerprint.
2. Distribute the new public key to CI/verifiers before the cutover.
3. Deploy the new private/public pair to HodgeForm. Startup/signing configuration must reject a mismatched pair.
4. Verify a canary RELEASE receipt against the independently provisioned new public key.
5. Record the old/new fingerprints and exact cutover time.
6. Retain old public keys for historical receipt verification. Retire/destroy old private keys according to policy.

## Compromise

Stop signing immediately, revoke access to the compromised secret, rotate, and identify every receipt minted during the exposure window. Do not claim cryptographic provenance for receipts whose signing key integrity cannot be established.
