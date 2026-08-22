#!/usr/bin/env bash
#
# Runs supabase/schema.sql against a throwaway PostgreSQL server and asserts
# that the access rules behave: that a stranger sees nothing, a viewer cannot
# write, an editor cannot hand out access, and a stale save is refused.
#
# Needs a local postgres (initdb/pg_ctl on PATH, or PostgreSQL 16 installed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PGTESTPORT:-5455}"
DATA="${PGTESTDATA:-/tmp/loft-pgdata}"
SOCK="${PGTESTSOCK:-/tmp/loft-pgrun}"

export PATH="/usr/lib/postgresql/16/bin:${PATH}"
command -v initdb >/dev/null || { echo "initdb not found — install PostgreSQL first."; exit 1; }

cleanup() { pg_ctl -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; }
trap cleanup EXIT

rm -rf "$DATA" "$SOCK"
mkdir -p "$DATA" "$SOCK"

# initdb refuses to run as root; drop to an unprivileged user when we are.
RUNNER=""
if [ "$(id -u)" = "0" ]; then
  id pgtest >/dev/null 2>&1 || useradd -m pgtest
  chown -R pgtest "$DATA" "$SOCK"
  RUNNER="su pgtest -c"
fi

run() { if [ -n "$RUNNER" ]; then su pgtest -c "PATH=$PATH $*"; else eval "$*"; fi; }

run "initdb -D $DATA -A trust -U postgres" >/dev/null
run "pg_ctl -D $DATA -o '-p $PORT -k $SOCK -c listen_addresses=' -l $DATA/log start" >/dev/null
sleep 2

PSQL=(psql -q -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORT" -U postgres)

"${PSQL[@]}" -c "create database loft;"
"${PSQL[@]}" -d loft -c "create schema if not exists test;"
"${PSQL[@]}" -d loft -f "$ROOT/supabase/tests/00-local-harness.sql"
"${PSQL[@]}" -d loft -f "$ROOT/supabase/schema.sql" >/dev/null

psql -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORT" -U postgres -d loft \
  -f "$ROOT/supabase/tests/01-access-control.sql" 2>&1 | grep -E "PASS|FAIL|passed|ERROR"
