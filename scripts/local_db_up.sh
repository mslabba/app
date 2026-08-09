#!/usr/bin/env bash
# Start local Postgres (Docker) and apply Alembic migrations.
# Does NOT touch production Railway.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting local Postgres (docker compose)..."
docker compose up -d postgres

echo "==> Waiting for Postgres health..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U powerauction -d powerauction >/dev/null 2>&1; then
    echo "    Postgres is ready."
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "ERROR: Postgres did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction}"

echo "==> Applying Alembic migrations..."
cd "$ROOT/backend"
# Prefer venv if present
if [[ -x "./venv/bin/alembic" ]]; then
  ./venv/bin/alembic upgrade head
elif command -v alembic >/dev/null 2>&1; then
  alembic upgrade head
else
  echo "ERROR: alembic not found. Activate backend/venv or pip install -r requirements.txt" >&2
  exit 1
fi

echo ""
echo "Local Postgres is up."
echo "  DATABASE_URL=$DATABASE_URL"
echo ""
echo "Next (optional seed + API):"
echo "  cd backend && source venv/bin/activate"
echo "  export DATABASE_URL='$DATABASE_URL'"
echo "  export DATA_BACKEND=postgres"
echo "  export PYTHONPATH=."
echo "  python scripts/seed_local_postgres.py"
echo "  uvicorn server:app --reload --port 8001"
echo ""
echo "Health check: curl http://localhost:8001/api/health"
