#!/usr/bin/env bash
# Teste les migrations et les règles RLS sur un Postgres local temporaire (sans Supabase).
# Usage : bash scripts/tester-sql.sh   (demande Postgres 15 ou plus installé localement)
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DOSSIER="$(mktemp -d)"
PORT="${PORT:-54329}"
LANCER=""
if [ "$(id -u)" = "0" ]; then chown postgres "$DOSSIER"; LANCER="sudo -u postgres"; command -v sudo >/dev/null || LANCER="su postgres -c"; fi
executer() { if [ "$LANCER" = "su postgres -c" ]; then su postgres -c "$*"; elif [ -n "$LANCER" ]; then $LANCER "$@"; else "$@"; fi; }
executer "$PGBIN/initdb" -D "$DOSSIER/data" -U postgres -A trust >/dev/null
executer "$PGBIN/pg_ctl" -D "$DOSSIER/data" -o "-p $PORT -k $DOSSIER" -l "$DOSSIER/log" start >/dev/null
trap 'executer "$PGBIN/pg_ctl" -D "$DOSSIER/data" stop -m fast >/dev/null; rm -rf "$DOSSIER"' EXIT
PSQL=(psql -h "$DOSSIER" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -d postgres)
"${PSQL[@]}" -f "$RACINE/supabase/tests/stub-supabase.sql"
for m in "$RACINE"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$m"; done
"${PSQL[@]}" -f "$RACINE/supabase/tests/rls.test.sql" 2>&1 | sed -n 's/^.*NOTICE:  //p'
echo "✓ Tests SQL réussis"
