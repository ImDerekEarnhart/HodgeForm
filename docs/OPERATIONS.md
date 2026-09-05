# HodgeForm production operations

## Health model

- `GET /api/health` is liveness only. It must stay cheap and does not prove the database is reachable.
- `GET /api/ready` is readiness. It fails when public-release configuration is unsafe or the database cannot answer `SELECT 1`.
- All HTTP responses carry `X-Request-Id`. Server logs are newline-delimited JSON and include the same request id.

## Database

Production uses standard PostgreSQL whenever `DATABASE_URL` is set. PGLite is a local/development convenience only.

Run migrations as a distinct deployment step before shifting traffic:

```sh
npm run db:migrate
```

Back up immediately before a schema-changing release:

```sh
DATABASE_URL=... ./scripts/postgres-backup.sh
```

Restore only during an approved incident/change window:

```sh
DATABASE_URL=... HODGEFORM_CONFIRM_RESTORE=RESTORE ./scripts/postgres-restore.sh backup.dump
```

For managed PostgreSQL, also enable the provider's automated backups, point-in-time recovery, encryption at rest, private networking, TLS, and alerting. Test restoration on a non-production database before relying on it.

## Deployment sequence

1. Build an immutable image from a clean checkout.
2. Run tests, typecheck, lint, dependency/secret/static scans and image scan.
3. Back up the production database.
4. Run migrations using the target release image/toolchain.
5. Start the new app with no traffic and wait for `/api/ready` to return 200.
6. Shift traffic gradually.
7. Verify login, workspace isolation, candidate creation, evidence submission and offline receipt verification.
8. Watch 4xx/5xx rate, readiness failures, DB pool errors, email delivery failures, executor failures and gate latency.

## Controlled-beta operator provisioning

Keep `HODGEFORM_RELEASE_CHANNEL=controlled_beta` and `HODGEFORM_ALLOW_SIGNUPS=false` until the public-GA gates are complete. After migrations, create the first verified owner without opening public signup. Supply the password only through the secret environment (never as a command-line argument):

```sh
export HODGEFORM_OPERATOR_PASSWORD='use-a-password-manager-generated-secret'
export HODGEFORM_OPERATOR_CONFIRM='PROVISION_OPERATOR:operator@example.com'
npm run operator:provision -- operator@example.com "Operator name"
unset HODGEFORM_OPERATOR_PASSWORD HODGEFORM_OPERATOR_CONFIRM
```

The command refuses duplicate accounts and creates an owner workspace in SaaS mode. Use the normal password-reset flow for existing users and `scripts/admin-owner-recovery.mjs` only for the documented break-glass ownership case.

## Rollback

Application rollback should normally roll back the image while leaving forward-compatible schema changes in place. Never automatically reverse a destructive migration. For an incompatible migration, use the documented migration-specific rollback/restore procedure and preserve release/evidence records.

## Backups and retention

Set explicit retention for database backups, logs, exported receipts and customer artifacts. Signed release receipts and audit records should be treated as long-lived records unless a customer contract/legal requirement specifies otherwise. Do not store model prompts or private source artifacts unless the product feature explicitly requires it.

## Railway application service

The source-controlled `railway.json` builds the unprivileged Docker image, runs
migrations as a separate pre-deploy step, starts the application without repeating
migrations, and checks `/api/ready` before routing traffic. Start with one replica;
both authentication and agent burst limits are currently process-local. Configure
trusted edge rate limiting before public signup or horizontal scaling.

The runtime image includes `scripts/provision-operator.mjs`. Because package-manager
executables are intentionally removed from the image, provision through a private
operator session with `node scripts/provision-operator.mjs <email> <name>` and the
password supplied through the platform secret environment. Remove the temporary
provisioning secret after use. Never include the password in command arguments.

Create a dedicated HodgeForm project with private PostgreSQL connectivity. Enable
and verify database backups and a restore drill before accepting customer data.
Set the service variables from `.env.production.example` together with DATABASE_URL,
BETTER_AUTH_URL=https://hodgeform.com, and HODGEFORM_EMAIL_PASSWORD_AUTH=true.
The example values are documentation, not launch-ready business identity or secrets.

Dynamic application requests are limited to 1 MiB and a 10-second body-read deadline
before JSON/form parsing. Oversized requests return 413; stalled uploads return 408.
Enforce connection and request-rate limits at the trusted ingress as well: a body
limit does not provide aggregate protection against many simultaneous connections.
