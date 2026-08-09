# Local Workstream A — Complete (pre-UI, pre-Railway)

This marks local platform work **through dual-backend FastAPI on Docker Postgres**, before:

- Workstream **B** (product UI redesign)
- Railway staging/production
- Production freeze/cutover

## What is done locally

| Area | Status |
|------|--------|
| Docker Compose Postgres (`:5434`) | Yes |
| Alembic schema (+ payment_gateway_settings) | Yes |
| ETL tooling (inventory/export/migrate/reconcile) | Yes |
| Dual-backend flag `DATA_BACKEND=firestore\|postgres` | Yes |
| Auth roles from Postgres when flagged | Yes |
| Users admin CRUD (profile store) | Yes |
| Auctions / categories / teams / players | Yes |
| Registrations | Yes |
| Public team tokens | Yes |
| Auction control + transactional bid/sell/release | Yes |
| Budget helpers + analytics | Yes |
| Sponsors | Yes |
| Bank details + Cashfree create/verify/list | Yes |
| Bulk Excel player upload | Yes |
| Seed + smoke + pytest auction tests | Yes |

Default remains **Firestore** unless `DATA_BACKEND=postgres`.

## Quick start

```bash
# 1. DB
./scripts/local_db_up.sh
# or full wipe + seed:
# ./backend/scripts/reset_local_postgres.sh

# 2. backend/.env (local only)
# DATA_BACKEND=postgres
# DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction

# 3. API
cd backend && source venv/bin/activate
export PYTHONPATH=. DATA_BACKEND=postgres
export DATABASE_URL=postgresql+psycopg://powerauction:powerauction@localhost:5434/powerauction
python scripts/seed_local_postgres.py
uvicorn server:app --reload --port 8001

# 4. Smoke + tests
python scripts/smoke_local_postgres.py
pytest tests/test_pg_repo_auction.py -v
```

See also: `docs/LOCAL_POSTGRES_SETUP.md`.

## Explicitly deferred (not local Workstream A)

| Item | When |
|------|------|
| Workstream B UI redesign | After you approve starting UI |
| Railway Postgres / staging deploy | Separate plan with you |
| Production freeze cutover (A6) | After staging gates |
| Staging Firebase project (R2) | For real auth E2E on staging |
| Official RO inventory re-run (R1) | Ops credentials |
| Automated full API contract suite in CI | Optional hardening |
| `server.py` split into packages | Cleanup; not required for local parity |

## Recommended next (after local A)

1. You verify smoke + pytest on your machine.  
2. Commit feature branch if not already.  
3. **Plan Railway + migration** (staging only first).  
4. Or start **Workstream B** UI on Firestore-compatible contracts (same API shapes).
