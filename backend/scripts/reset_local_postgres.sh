#!/usr/bin/env bash
# Wipe local Docker Postgres volume and re-apply migrations + demo seed.
# Does NOT touch Railway or production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> Stopping and removing local powerauction Postgres volume..."
docker compose down -v

echo "==> Starting fresh Postgres + Alembic..."
./scripts/local_db_up.sh

export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction}"
export DATA_BACKEND=postgres
export PYTHONPATH="$ROOT/backend"

echo "==> Seeding demo data..."
cd "$ROOT/backend"
if [[ -x "./venv/bin/python" ]]; then
  ./venv/bin/python scripts/seed_local_postgres.py
else
  python scripts/seed_local_postgres.py
fi

echo ""
echo "Local Postgres reset complete."
echo "  DATABASE_URL=$DATABASE_URL"
echo "  Start API: cd backend && DATA_BACKEND=postgres uvicorn server:app --reload --port 8001"
