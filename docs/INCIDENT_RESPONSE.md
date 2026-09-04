# Incident response runbook

Severity 1 includes suspected tenant-boundary bypass, signing-key compromise, executor escape, unauthorized release approval, credential theft, destructive data loss, or evidence/receipt integrity compromise.

1. Stop or restrict affected traffic. Keep `/api/health` available when safe for orchestration.
2. Preserve logs, database snapshots, receipts and relevant container/runtime metadata. Do not rewrite audit evidence.
3. Revoke compromised API tokens/sessions and rotate affected secrets.
4. If a receipt-signing private key may be compromised, stop minting receipts immediately, rotate to a new keypair, publish the new pinned public key through an independent channel, and record the exact cutover time/fingerprint.
5. Determine impacted tenants and exact artifact/receipt IDs before communicating scope.
6. Repair with the smallest change that restores the invariant; do not weaken policy checks to restore availability.
7. Re-run release/security gates and perform a staged redeploy.
8. Produce a post-incident report with root cause, impact, evidence, remediation and prevention work.

HodgeForm receipts attest a configured release decision; they are not universal safety certificates. Incident communications must preserve that boundary.

## Break-glass workspace owner recovery

If a workspace is operationally stranded after identity loss, first restore/recover the original identity when possible. As a last resort, an authorized database operator may promote an **existing verified user** using:

```sh
HODGEFORM_BREAK_GLASS_CONFIRM='TRANSFER_OWNER:<workspace-id>:<user-id>' \
DATABASE_URL=... node scripts/admin-owner-recovery.mjs <workspace-id> <user-id>
```

Record the operator, reason, workspace, target identity, database audit logs and exact timestamp. This tool does not create users and requires an exact confirmation string to reduce accidental use.
