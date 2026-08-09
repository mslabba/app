# PowerAuction — Staging Migration Runbook (Workstream A)

**Branch:** `feature/powerauction-platform-modernization`  
**Scope:** Inventory, schema, ETL tooling. Does **not** switch production off Firestore.

## Local Docker first (recommended)

Before Railway staging, develop against local Postgres:

See **`docs/LOCAL_POSTGRES_SETUP.md`**.

```bash
./scripts/local_db_up.sh
# then DATA_BACKEND=postgres + seed + uvicorn
```

## Prerequisites

1. Python 3.11+ and `backend/venv`
2. **Read-only** production Firestore service account JSON (never a write-capable key for inventory/export)
3. Postgres (`DATABASE_URL`) — **local Docker preferred now**; Railway staging later
4. Separate **staging Firebase** project for future API tests (not required for inventory alone)

## Install

```bash
cd backend
source venv/bin/activate   # or create: python3 -m venv venv
pip install -r requirements.txt
export PYTHONPATH=.
```

## Phase A1 — Inventory (read-only)

```bash
export FIREBASE_CREDENTIALS_PATH=/secure/path/firestore-readonly.json
export FIRESTORE_READ_ONLY=true
python scripts/firestore_inventory.py
```

Outputs:

- `migration_output/inventory_latest.json`
- Per-collection counts, field presence, redacted samples

## Phase A1b — Export JSONL (read-only)

```bash
python scripts/firestore_export.py
# path recorded in migration_output/export_latest_path.txt
```

## Phase A2 — Apply schema on staging Postgres

```bash
export DATABASE_URL='postgresql+psycopg://USER:PASS@HOST:5432/DB'
# or postgresql:// (Alembic/SQLAlchemy will use psycopg2/psycopg as installed)

alembic upgrade head
```

## Phase A3 — Load into staging Postgres

Prefer offline export (no live FS dependency during load):

```bash
export DATABASE_URL='...'
EXPORT_DIR=$(cat migration_output/export_latest_path.txt)
python scripts/migrate_firestore_to_postgres.py --from-export "$EXPORT_DIR"
```

Or live read (still no FS writes):

```bash
python scripts/migrate_firestore_to_postgres.py
```

Report: `migration_output/migration_report_latest.json`  
Includes **purse reconciliation** (original vs recomputed).

## Phase A3b — Reconcile counts

```bash
python scripts/reconcile_counts.py --from-export "$EXPORT_DIR"
# or live:
python scripts/reconcile_counts.py
```

## What this does *not* do yet

- Does **not** set `DATA_BACKEND=postgres` on production FastAPI
- Does **not** change `server.py` business routes
- Does **not** create production Railway Postgres
- Does **not** delete Firestore data
- Does **not** redesign UI

## Next implementation after gates

1. Attach inventory counts to master plan  
2. Port repositories behind FastAPI with feature flag `DATA_BACKEND`  
3. Transactional bid/sell  
4. Staging E2E  

See `docs/POWERAUCTION_MASTER_IMPLEMENTATION_PLAN.md`.
