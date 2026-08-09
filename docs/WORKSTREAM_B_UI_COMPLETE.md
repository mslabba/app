# Workstream B — Product UI (local complete)

Branch: `feature/powerauction-platform-modernization`

## Done

| Phase | Deliverable |
|-------|-------------|
| **B1** | Brand tokens — crimson/charcoal product shell (`App.css`, `index.css`) |
| **B2** | `AppShell` sidebar + mobile drawer; FloatingMenu retired |
| **B3–B5** | Dashboard, auctions, teams, categories, players, registrations polish |
| **B6** | Live control header under AppShell |
| **B7** | Public team stats brand loading/error/header |
| **B8** | Settings, users, sponsors, payments, analytics empty state |
| **B9** | Skip link, focus rings, Escape-close drawer, reduced motion, aria labels |

## How to preview

```bash
cd frontend && npm start
# Login → /admin or /team
```

## Explicitly deferred

- Full visual rewrite of AuctionControl fullscreen projector board  
- Full analytics charts (placeholder remains)  
- Railway deploy / Postgres cutover — **next program phase**  

## Next program phase: Railway + migration

When ready (Docker/Railway):

1. Staging Railway Postgres  
2. Apply Alembic migrations  
3. ETL from Firestore export → Postgres  
4. Reconcile counts / purse report  
5. Deploy API with `DATA_BACKEND=postgres` on staging  
6. E2E auth with staging Firebase  
7. Production freeze plan (2–4h) after gates G3–G11  

Local dual-backend remains available via `docker compose` + `DATA_BACKEND=postgres` when Docker is stable.
