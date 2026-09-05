#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
command -v pg_dump >/dev/null
command -v pg_restore >/dev/null
command -v psql >/dev/null
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT INT TERM
DUMP="$TMP/hodgeform.dump"
DATABASE_URL="$DATABASE_URL" ./scripts/postgres-backup.sh "$DUMP" >/dev/null
RESTORE_DB="hodgeform_restore_${GITHUB_RUN_ID:-$$}_${GITHUB_RUN_ATTEMPT:-1}"
ADMIN_URL="${DATABASE_URL%/*}/postgres"
TARGET_URL="${DATABASE_URL%/*}/${RESTORE_DB}"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "drop database if exists \"$RESTORE_DB\"" >/dev/null
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "create database \"$RESTORE_DB\"" >/dev/null
cleanup_db(){ psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "drop database if exists \"$RESTORE_DB\"" >/dev/null 2>&1 || true; }
trap 'cleanup_db; rm -rf "$TMP"' EXIT INT TERM
DATABASE_URL="$TARGET_URL" HODGEFORM_CONFIRM_RESTORE=RESTORE ./scripts/postgres-restore.sh "$DUMP" >/dev/null
count="$(psql "$TARGET_URL" -Atc "select count(*) from _migrations")"
[ "$count" -ge 4 ]
psql "$TARGET_URL" -Atc "select to_regclass('public.release_receipts') is not null" | grep -q t
echo "postgres backup/restore: PASS (migrations=$count)"
