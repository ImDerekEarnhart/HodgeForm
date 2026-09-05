#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
DUMP="${1:?usage: postgres-restore.sh <backup.dump>}"
: "${HODGEFORM_CONFIRM_RESTORE:?set HODGEFORM_CONFIRM_RESTORE=RESTORE to acknowledge destructive restore}"
[ "$HODGEFORM_CONFIRM_RESTORE" = "RESTORE" ] || { echo "restore confirmation refused" >&2; exit 2; }
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$DUMP"
