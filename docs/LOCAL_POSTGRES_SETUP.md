# Local Postgres setup

Use this for developing and testing the dual-backend FastAPI path **without** touching production Railway.

Default production path remains `DATA_BACKEND=firestore`.

You can use either:

| Option | Port | When to use |
|--------|------|-------------|
| **Homebrew Postgres (recommended if Docker is flaky)** | `5432` | Native Mac install |
| **Docker Compose** | `5434` | Isolated container DB |

Same credentials in both cases: user / password / db = `powerauction`.

## Prerequisites

- Python 3.11+ with `backend/venv` and `pip install -r requirements.txt`
- **Either** Homebrew Postgres **or** Docker Desktop (Compose v2)

---

## Option A — Homebrew Postgres (no Docker)

### Install (once)

```bash
brew install postgresql@18
brew services start postgresql@18
# Ensure client tools are on PATH (Intel Homebrew example):
# echo 'export PATH="/usr/local/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

### Create DB + migrate + seed

```bash
chmod +x scripts/local_native_pg_setup.sh
./scripts/local_native_pg_setup.sh
```

This:

1. Starts Homebrew Postgres if needed (`localhost:5432`)
2. Creates role + database `powerauction` / `powerauction`
3. Runs `alembic upgrade head`
4. Seeds demo data (set `SEED=0` to skip)

### Backend env (native)

```bash
APP_ENV=development
DATA_BACKEND=postgres
DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction
```

### Useful commands

```bash
brew services start postgresql@18   # start
brew services stop postgresql@18    # stop
pg_isready -h localhost -p 5432     # health
PGPASSWORD=powerauction psql -h localhost -p 5432 -U powerauction -d powerauction
```

### Reset schema (native)

```bash
# Drop + recreate public schema, then re-migrate/seed
PGPASSWORD=powerauction psql -h localhost -p 5432 -U powerauction -d powerauction -c \
  'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO powerauction;'
export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction
export DATA_BACKEND=postgres PYTHONPATH=backend
cd backend && ./venv/bin/alembic upgrade head && ./venv/bin/python scripts/seed_local_postgres.py
```

---

## Option B — Docker Compose

### 1. Start Postgres + migrate

From the repo root:

```bash
chmod +x scripts/local_db_up.sh
./scripts/local_db_up.sh
```

This:

1. Starts Postgres 16 on `localhost:5434` (user/pass/db: `powerauction`)
2. Waits until healthy
3. Runs `alembic upgrade head`

> Port **5434** is used so it does not clash with Homebrew/other local Postgres on 5432/5433.

### 2. Backend env for Docker Postgres

Create or edit `backend/.env` (do not commit secrets):

```bash
APP_ENV=development
DATA_BACKEND=postgres
DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction

# Firebase Auth still used for JWT verification (same project is fine for local)
# FIREBASE_CREDENTIALS_PATH=./firebase-admin.json

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### 3. Seed demo data (optional)

```bash
cd backend
source venv/bin/activate
export PYTHONPATH=.
export DATA_BACKEND=postgres
export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction
python scripts/seed_local_postgres.py
```

### Stop / reset (Docker)

```bash
# Stop container (data volume kept)
docker compose stop postgres

# Full wipe + migrate + seed
chmod +x backend/scripts/reset_local_postgres.sh
./backend/scripts/reset_local_postgres.sh

# Or manual wipe
docker compose down -v
```

---

## Run the API (either option)

```bash
cd backend
source venv/bin/activate
export PYTHONPATH=.
export DATA_BACKEND=postgres
# Homebrew:
export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction
# Docker instead:
# export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction

# Note: port 8000 may already be in use locally — pick a free port if needed
uvicorn server:app --reload --port 8001
```

## Smoke tests (public routes)

Automated:

```bash
cd backend
export DATA_BACKEND=postgres
export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction
python scripts/smoke_local_postgres.py
# BASE_URL=http://127.0.0.1:8001 python scripts/smoke_local_postgres.py
```

Manual:

```bash
curl -s http://localhost:8001/api/health | jq
curl -s http://localhost:8001/api/auctions/local-demo-event | jq
curl -s http://localhost:8001/api/teams/event/local-demo-event | jq
curl -s http://localhost:8001/api/auctions/local-demo-event/players | jq
curl -s http://localhost:8001/api/auction/state/local-demo-event | jq
curl -s http://localhost:8001/api/auctions/local-demo-event/registration-count | jq
curl -s http://localhost:8001/api/analytics/event/local-demo-event | jq
```

Health should report:

```json
{
  "status": "healthy",
  "data_backend": "postgres",
  "postgres": "connected",
  "firebase": "connected"
}
```

## Authenticated flows

JWT is still verified via Firebase Auth. Log in through the frontend (or get an ID token), then exercise:

- `POST /api/auction/start/{event_id}`
- `POST /api/auction/next-player/{event_id}?player_id=...`
- `POST /api/bids/place`
- `POST /api/bids/finalize/{player_id}?event_id=...`
- `POST /api/players/{player_id}/sell?...`

Demo users (roles in Postgres only — Firebase must still have matching UIDs for real tokens):

| Role | UID | Email |
|------|-----|-------|
| organizer | `local-demo-organizer` | organizer@local.test |
| team admin | `local-demo-team-admin` | teamadmin@local.test |

For full E2E with real Firebase logins, seed rows whose `id` matches your Firebase UIDs (use `pg_repo.upsert_user`).

## Load real export data (optional)

If you already ran a read-only Firestore export:

```bash
export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction
EXPORT_DIR=$(cat migration_output/export_latest_path.txt)
python scripts/migrate_firestore_to_postgres.py --from-export "$EXPORT_DIR"
python scripts/reconcile_counts.py --from-export "$EXPORT_DIR"
```

## Tests

```bash
cd backend
export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5432/powerauction
export DATA_BACKEND=postgres PYTHONPATH=.
pytest tests/test_pg_repo_auction.py -v
python scripts/smoke_local_postgres.py
```

Local Workstream A checklist: `docs/LOCAL_WORKSTREAM_A_COMPLETE.md`.

## Payments (Cashfree) on local Postgres

Payment create/verify/list and bank-details routes support Postgres when `DATA_BACKEND=postgres`.

Gateway credentials resolve in this order:

1. Row in `payment_gateway_settings` (id `payment_gateway_config`) — set via super-admin API  
2. Env vars: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_MODE=sandbox`

Without credentials, create-order returns a clear “gateway not configured” error (expected).  
Event must have `payment_settings.collect_payment=true` and a `registration_fee`.

## Notes

- **No Railway / production changes** in this flow.
- Leaving `DATA_BACKEND` unset or `firestore` keeps the current production path.
- Docker port is **5434**; Homebrew is **5432** — use the matching `DATABASE_URL`.
