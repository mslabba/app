#!/usr/bin/env bash
# Set up Homebrew Postgres for PowerAuction (no Docker).
# Creates role/db powerauction, runs Alembic, optional seed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction}"
export DATA_BACKEND=postgres
export PYTHONPATH="$ROOT/backend"

echo "==> Ensuring PostgreSQL is running (Homebrew)..."
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  if brew services list 2>/dev/null | grep -q 'postgresql@18'; then
    brew services start postgresql@18
  elif brew services list 2>/dev/null | grep -q 'postgresql@16'; then
    brew services start postgresql@16
  else
    brew services start postgresql 2>/dev/null || true
  fi
  for i in $(seq 1 20); do
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "Postgres is not accepting connections on localhost:5432."
  echo "Install with: brew install postgresql@18 && brew services start postgresql@18"
  exit 1
fi

echo "==> Creating role + database powerauction (if needed)..."
psql -h localhost -p 5432 -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'powerauction') THEN
    CREATE ROLE powerauction LOGIN PASSWORD 'powerauction';
  ELSE
    ALTER ROLE powerauction WITH LOGIN PASSWORD 'powerauction';
  END IF;
END
$$;
SQL

if ! psql -h localhost -p 5432 -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'powerauction'" | grep -q 1; then
  psql -h localhost -p 5432 -d postgres -c "CREATE DATABASE powerauction OWNER powerauction;"
fi

psql -h localhost -p 5432 -d powerauction -v ON_ERROR_STOP=1 <<'SQL'
GRANT ALL ON SCHEMA public TO powerauction;
ALTER SCHEMA public OWNER TO powerauction;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO powerauction;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO powerauction;
SQL

echo "==> Alembic upgrade head..."
cd "$ROOT/backend"
if [[ -x "./venv/bin/alembic" ]]; then
  ./venv/bin/alembic upgrade head
else
  alembic upgrade head
fi

if [[ "${SEED:-1}" == "1" ]]; then
  echo "==> Seeding demo data..."
  if [[ -x "./venv/bin/python" ]]; then
    ./venv/bin/python scripts/seed_local_postgres.py
  else
    python scripts/seed_local_postgres.py
  fi
fi

echo ""
echo "Native Postgres ready."
echo "  DATABASE_URL=$DATABASE_URL"
echo "  Start API:"
echo "    cd backend && export DATABASE_URL='$DATABASE_URL' DATA_BACKEND=postgres PYTHONPATH=. \\"
echo "      && ./venv/bin/uvicorn server:app --reload --port 8001"
echo ""
echo "  Note: Docker Compose uses port 5434; Homebrew uses 5432."
