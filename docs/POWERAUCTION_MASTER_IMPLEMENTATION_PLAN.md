# PowerAuction — Master Implementation Plan

**Database Migration · Architecture Modernization · UI/UX Redesign**

| | |
|--|--|
| **Status** | Planning only — no application code, production, Firestore, or Railway changes |
| **Date** | 2026-08-09 |
| **Branch** | `feature/powerauction-platform-modernization` (from `origin/master` @ `2730a02`) |
| **Sources** | `docs/UI_UX_REDESIGN_AUDIT.md`, `docs/FIRESTORE_TO_POSTGRES_MIGRATION_PLAN.md`, live repository re-inspection |
| **Authority** | This document is the **primary** implementation blueprint going forward |

---

## 0. Plan reconciliation (Part 1)

### 0.1 What each prior document covers

| Document | Strengths retained |
|----------|-------------------|
| **UI/UX Redesign Audit** | Full route inventory; role map; page quality scores; Priority A–D; AppShell IA; special layouts; design system; 10-phase UI roadmap; risk of dual design systems |
| **Firestore → Postgres Plan** | 13-collection inventory; schema; ID preservation; Auth Option A; concurrency; payments; Cloudinary; cutover/freeze; gates; no dual-write |

### 0.2 Conflicts resolved

| Topic | Conflict | Resolution in this plan |
|-------|----------|-------------------------|
| Brand primary (blue vs crimson) | UI audit preferred navy+blue+gold; marketing uses crimson logo | **Product app tokens:** deep navy + **logo crimson primary** + gold for money/bid; align marketing later |
| When UI vs DB | Migration said UI after DB; UI audit can start tokens earlier | **Workstream A = DB/API**; **Workstream B = UI** — B phases 1–2 (tokens/shell) may start after staging API exists; live auction UI **after** transactional API on Postgres |
| Real-time | Both said keep polling | Confirmed: polling Phase 1 |
| Auth | Both said keep Firebase Auth | Confirmed Option A |
| Purse source of truth | Migration flagged drift | See §11 — sold_price authoritative for history; store budget; recompute spent/remaining with discrepancy report |

### 0.3 Gaps fixed in this master plan

1. **Mandatory read-only production inventory** before schema freeze (not code-only collection list).  
2. **Player `event_id` backfill gate** with quarantine for unresolvable rows.  
3. **Team purse reconciliation formula** and sell-path inconsistency (`sell` updates `remaining` only; `complete-transaction` updates spent/remaining/count).  
4. **Git branch + workstream sequencing + safety gates** combined.  
5. **File-by-file implementation map** for backend and frontend.  
6. **User↔team 1:1** preserved; `team_members` future-only.  
7. **Post-migration authz** must read roles from Postgres, not Firestore.  
8. **UI redesign dependency graph** against DB milestones.  

### 0.4 Dependencies (DB ↔ UI)

```
[ DB inventory + staging migrate ]
        ↓
[ API on Postgres (contracts stable) ]
        ↓
[ UI design system + AppShell ]
        ↓
[ Organizer pages UI ]
        ↓
[ Registration / Team / Live auction UI ]  ← needs transactional bid/sell
```

**Never** mix AuctionControl visual rewrite PRs with Firestore→SQL port PRs.

---

## 1. Executive Summary

PowerAuction must:

1. **Migrate all Firestore application data → PostgreSQL on Railway** without intentional data loss.  
2. **Keep Firebase Auth** (Phase 1) with `users.id = firebase_uid`.  
3. **Keep FastAPI REST contracts** so the React app does not need a simultaneous rewrite.  
4. **Strengthen auction write integrity** with SQL transactions (same rules/formulas).  
5. **Redesign the product UI** (app shell + Priority A pages) after API stability.  
6. **Keep marketing site** largely as-is (already modernized).  

### Locked decisions (unless inventory proves otherwise)

| Decision | Choice |
|----------|--------|
| App DB | PostgreSQL (Railway) |
| ORM | SQLAlchemy 2.x sync + Alembic |
| Auth | Firebase Auth retained |
| Real-time | Polling retained for cutover |
| Cutover | Maintenance freeze + final export |
| Dual-write | Not required |
| Firestore deletion | Forbidden until long retention after success |
| Safe-bid formula | Unchanged (`base_price_calculator.py`) |
| Cashfree behavior | Unchanged |
| Media | URL-only migration |

### Out of scope for first implementation

- Production Postgres creation (until gates pass)  
- Dual Auth systems / removing Firebase Auth  
- WebSockets/Redis mandatory infra  
- Changing auction business rules  
- Rewriting the entire monorepo in one PR  

---

## 2. Current Architecture

### 2.1 Verified stack (2026-08-09 re-check)

| Layer | Technology | Evidence |
|-------|------------|----------|
| Frontend | React 19, CRA+CRACO, RR7, Tailwind 3, shadcn/Radix, Lucide, Sonner | `frontend/package.json` |
| Marketing | `frontend/src/marketing/*` brand system | present |
| Backend | FastAPI, Pydantic 2, Gunicorn 4× UvicornWorker | `server.py` 3672 lines, `railway.json` |
| Auth | Firebase client + Admin `verify_id_token` | `lib/firebase.js`, `auth_middleware.py` |
| Data | Firestore flat collections | `db.collection(...)` throughout `server.py` |
| Media | Cloudinary URLs | upload components + string fields |
| Payments | Cashfree create-order + verify | payment routes |
| Deploy API | Railway | `backend/railway.json` |
| Deploy web | GitHub Pages `gh-pages` | `npm run deploy` |
| Git tip | `master` = `origin/master` = `2730a02` | verified |

### 2.2 Topology (today)

```
Browser (GitHub Pages)
  → Firebase Auth
  → FastAPI (Railway)
       → Firestore
       → Cashfree
       → SMTP (password reset; tokens in-memory)
  → Cloudinary (direct upload)
```

### 2.3 Structural problems (platform)

- Monolithic `server.py` with storage + HTTP mixed.  
- No FK integrity; string IDs only.  
- `place_bid` non-atomic; multi-worker races possible.  
- Dual UI systems (purple glass app vs marketing brand).  
- FloatingMenu rainbow FAB navigation.  
- Players often **lack `event_id`** at write time.  

---

## 3. Target Architecture

```
Browser
  → React (redesigned shell over time)
  → Firebase Auth (identity only)
  → FastAPI /api/* (same contracts)
       → SQLAlchemy → PostgreSQL (Railway)
       → Cashfree
       → Firebase Admin (token verify only)
  → Cloudinary URLs
```

| Component | Status |
|-----------|--------|
| FastAPI | **Retained** |
| React SPA | **Retained**, redesigned in phases |
| Firebase Auth | **Retained** Phase 1 |
| Firestore app data | **Replaced** by Postgres after cutover |
| Firestore (post-cutover) | **Deprecated / read-only backup** |
| Cloudinary | **Retained** |
| Cashfree | **Retained** |
| Polling | **Retained** Phase 1 |
| SSE/WebSockets | **Deferred** |
| Redis | **Deferred** (not required) |
| Dual-write | **Rejected** for cutover |

---

## 4. Repository Findings (re-inspection deltas)

| Finding | Detail |
|---------|--------|
| `server.py` size | ~3672 lines (grew vs earlier notes) |
| Collections via code | 13 (same list) — still need prod inventory for unknown fields |
| Sell path | `sell_player_directly` updates **`remaining` only** (not always `spent`/`players_count`) |
| Complete-transaction | Updates spent, remaining, players_count atomically (Firestore txn) |
| Team list endpoints | Often recompute spent/count from sold players |
| User–team | Single `users.team_id` (1:1 application model) |
| Public auction-state bug | Historical `auction_state.limit(1)` without event filter in one public path — Postgres must use `event_id` correctly while matching response shape |
| Docs location | Migration plan lives under `docs/` (not repo root) |
| Untracked | `docs/` was untracked on master before feature branch |

No contradiction that invalidates Postgres recommendation.

---

## 5. Firestore Inventory

### 5.1 Code-discovered collections (must migrate)

| Collection | Doc ID | Purpose |
|------------|--------|---------|
| `users` | Firebase UID | Profile, role, team_id |
| `events` | UUID | Auctions |
| `categories` | UUID | Per-event categories |
| `teams` | UUID | Franchises + purse |
| `players` | UUID | Pool + sold/unsold/current |
| `player_registrations` | UUID | Applications |
| `sponsors` | UUID | Sponsors |
| `auction_state` | `auction_{event_id}` | Live cursor |
| `bids` | UUID | **Authoritative bid ledger** |
| `public_team_tokens` | auto-ID | Share links |
| `payment_orders` | order_id | Cashfree lifecycle |
| `bank_details` | UUID | Organizer bank/UPI |
| `payment_gateway_settings` | intended `payment_gateway_config` | Cashfree secrets (move to env) |

### 5.2 Mandatory Phase 0: production read-only inventory

**Script (future):** `backend/scripts/firestore_inventory.py` — **read-only**.

Outputs:

- Exact counts per collection  
- Field presence % and type histograms  
- Sample docs (PII redacted in shared reports)  
- Unexpected fields not in code models  
- Null patterns for `event_id`, `category_id`, `sold_*`  
- Invalid references (category missing, etc.)  
- Timestamp parse failures  

**Gate:** Inventory report attached before Alembic schema is frozen.

### 5.3 Historical coverage

| Data | Source of truth |
|------|-----------------|
| All bids | `bids` |
| Live truncated history | `auction_state.bid_history` (last 10 only — **not complete**) |
| Sale outcomes | `players.status`, `sold_to_team_id`, `sold_price` |
| Registrations | `player_registrations` all statuses |
| Payments | `payment_orders` all statuses |
| Status change audit log | **Does not exist** — cannot invent |

---

## 6. PostgreSQL Architecture

| Item | Spec |
|------|------|
| Host | Railway PostgreSQL (staging first, prod later) |
| Driver | `psycopg` v3 or `psycopg2` |
| ORM | SQLAlchemy 2.0 **sync** |
| Migrations | Alembic |
| Sessions | `get_db()` per request; commit/rollback |
| Pool | `pool_pre_ping=True`, size tuned for 4 Gunicorn workers |
| Money | `INTEGER` (match current API ints) |
| Time | `TIMESTAMPTZ` |
| Flexible blobs | JSONB: `rules`, `payment_settings`, `stats` |

**Why Postgres:** relational domain, ACID for bids/sales, Railway co-location, backups, indexes for event-scoped lists.

---

## 7. Database Schema

### 7.1 Tables

| Table | PK | Notes |
|-------|-----|------|
| `users` | `id` TEXT (= firebase_uid) | |
| `events` | `id` TEXT | |
| `categories` | `id` TEXT | FK event |
| `teams` | `id` TEXT | FK event; admin_uid |
| `players` | `id` TEXT | FK category + **event_id** (backfilled) |
| `player_registrations` | `id` TEXT | |
| `sponsors` | `id` TEXT | |
| `auction_states` | `event_id` TEXT PK | 1:1 event |
| `bids` | `id` TEXT | Full history |
| `public_team_tokens` | UUID PK + unique `token` | |
| `payment_orders` | `order_id` TEXT PK | |
| `bank_details` | `id` TEXT | unique(user_id) |
| `migration_runs` | bigserial | Ops |
| `id_mappings` | composite | Audit optional |
| `migration_quarantine` | id | Unmappable rows |

**No** `organizations`, **no** `team_members` in v1 (future enhancement only).  
**No** analytics snapshot tables (computed).  
**Secrets:** Cashfree keys → Railway env, not table plaintext.

### 7.2 Indexes (from real query patterns)

- `events(created_by, created_at DESC)`  
- `categories(event_id)`  
- `teams(event_id)`  
- `players(category_id)`, `players(event_id, status)`, `players(sold_to_team_id, status)`  
- `player_registrations(event_id, status)`  
- `bids(event_id, created_at)`, `bids(player_id, created_at)`  
- `payment_orders(event_id, created_at)`  
- `public_team_tokens(token) UNIQUE`, `(team_id)`  
- `users(email) UNIQUE`, `(role)`, `(team_id)`  

---

## 8. ERD

```
users (firebase_uid)
   │ created_by
   ▼
events
   ├── categories ──► players ── sold_to ──► teams ── admin_uid ──► users
   │                      ▲                    │
   │                      │                    └── public_team_tokens
   │                      └── bids ────────────┘
   ├── player_registrations ──► payment_orders
   │         └── player_id ──► players (on approve)
   ├── sponsors
   └── auction_states (1:1)
```

---

## 9. Data Mapping

| Firestore | Postgres | Transform |
|-----------|----------|-----------|
| users | users | PK=uid |
| events | events | rules/payment_settings → JSONB |
| categories | categories | map `base_price_min` → base_price if present |
| teams | teams | import as-is; reconcile spent later |
| players | players | backfill event_id; preserve sold_* |
| player_registrations | player_registrations | all statuses |
| sponsors | sponsors | |
| auction_state | auction_states | strip `auction_` prefix; ignore truncated bid_history as SoT |
| bids | bids | authoritative |
| public_team_tokens | public_team_tokens | new UUID PK; keep token |
| payment_orders | payment_orders | PK=order_id |
| bank_details | bank_details | |
| payment_gateway_settings | env / non-secret platform_settings | |

Import order: users → events → categories → teams → players → registrations → sponsors → bids → auction_states → payments → tokens → bank_details.

---

## 10. ID Strategy

**Preserve external IDs as PKs** (TEXT).

| ID | Visible in |
|----|------------|
| Firebase UID | JWT, users, created_by, admin_uid |
| event id | routes `/admin/*`, `/auctions/:id/register`, `/display/:id` |
| team/player/registration/bid ids | APIs + admin UI |
| payment order_id | Cashfree + return URLs |
| public token | query string |

Only `public_team_tokens` internal PK may be new UUID; **token string preserved**.

---

## 11. Data Cleanup / Backfill

### 11.1 Player `event_id`

```
player.category_id → categories.event_id → players.event_id
```

| Case | Action |
|------|--------|
| Category exists | Set event_id |
| Category missing | Quarantine + report; **do not delete** |
| Conflicting event_id present | Prefer category-derived; log conflict |

**Gate:** 0 unresolvable players for events with historical activity, or explicit human waiver for quarantine count.

### 11.2 Team purse (financial SoT)

**Current behavior (code):**

- `place_bid` / budget checks use `teams.remaining` and calculator.  
- `complete-transaction` sets `spent`, `remaining`, `players_count`.  
- `sell_player_directly` adjusts **`remaining` only** (risk of `spent` drift).  
- List team endpoints often recompute spent/count from sold players.

**Migration behavior:**

1. Import raw team fields.  
2. Compute `sum_sold = SUM(sold_price) WHERE sold_to_team_id=team AND status=sold`.  
3. Report: `budget`, stored `spent`, stored `remaining`, `sum_sold`, `budget - sum_sold`.  
4. **Default target after migration:**  
   - `spent = sum_sold`  
   - `remaining = budget - spent`  
   - `players_count = count(sold)`  
   unless discrepancy report flags manual review teams (never silent drop of sold player rows).

**Historical SoT for sales:** `players.sold_price` + `sold_to_team_id` + `status`.  
**Target runtime:** same recompute-or-transactional update pattern; prefer updating spent+remaining+count together in all sell paths (behavior fix only if product accepts as bugfix during API port — document in change log; still no formula change for safe-bid).

---

## 12. Authentication

| Phase | Identity | Profile/role store |
|-------|----------|-------------------|
| Today | Firebase JWT | Firestore `users` (+ claims fallback) |
| After cutover | Firebase JWT | **Postgres `users`** |
| Future (separate) | Optional native auth | Postgres |

Mapping: `firebase_uid == users.id`.  
Password reset remains email-token flow (in-memory tokens today — separate hardening later).

---

## 13. Authorization

### CURRENT

- Roles: `super_admin`, `event_organizer`, `team_admin`; models also `auctioneer`, `viewer` (underused in UI).  
- Frontend: organizers share `/admin/*` with super admin.  
- Backend: ownership via `events.created_by`.  

### TARGET (migration)

- Same role strings and ownership rules.  
- Role source = **Postgres only** after cutover.  
- No silent expansion of auctioneer UX.

### FUTURE (separate project)

- Distinct organizer/super-admin UX; first-class auctioneer; optional org memberships / team_members.

---

## 14. Auction Transactions

Preserve validation order from existing code (budget, base-price obligations via `base_price_calculator`, bid > current).

### Target write patterns

**place_bid** (single transaction):

```
BEGIN
  LOCK auction_states FOR UPDATE
  LOCK teams FOR UPDATE
  validate status/player/amount/safe-bid rules (same Python logic)
  INSERT bids
  UPDATE auction_states (current_*, timer)
COMMIT
```

**sell / complete-transaction:**

```
BEGIN
  LOCK player, team, auction_state
  assert player available/current
  assert budget
  UPDATE player sold_*
  UPDATE team spent/remaining/players_count
  CLEAR auction current_*
COMMIT
```

Do not change min increments or obligation formulas.  
Optional later: idempotency keys — not required for v1 if state checks prevent double-sell.

---

## 15. Real-Time Strategy

| Phase | Approach |
|-------|----------|
| Migration + cutover | **Keep HTTP polling** (`AuctionControl` setInterval → `/auction/state/{id}`) |
| Post-stability | Optional SSE after commit; no Redis required initially |

Display + team owner continue polling/fetch until a dedicated real-time project is approved.

---

## 16. Payments

- Migrate **all** `payment_orders` statuses.  
- PK = `order_id` (Cashfree).  
- Preserve customer PII, amounts, timestamps, registration links.  
- Do not recreate Cashfree orders.  
- Gateway credentials → Railway env.  
- Flow unchanged: create-order → checkout → verify → register-player.

---

## 17. Cloudinary

Migrate URL strings only:

- player `photo_url`, registration `identity_proof_url`  
- event logo/banner, team logo, sponsor logo  

No binary migration. Validate non-null rates in reconciliation.

---

## 18. Railway

| Env | Services |
|-----|----------|
| Staging | API + Postgres staging |
| Production (later) | Existing API service + new Postgres |

**Vars:** `DATABASE_URL`, Firebase, Cashfree, Cloudinary, `FRONTEND_URL`, `BACKEND_URL`, `APP_ENV`.  

**Order:** staging DB → migrate → API port → tests → prod DB → freeze → final migrate → switch release → retain Firestore.

**No** mandatory Redis/worker for migration.

---

## 19. Migration Tooling

```
backend/scripts/
  firestore_inventory.py          # read-only
  firestore_export.py             # JSONL dump
  migrate_firestore_to_postgres.py
  reconcile_counts.py
  backfill_player_event_id.py
  reconcile_team_purse.py
```

Properties: upsert by PK, logged, checkpointed per collection, **never deletes Firestore**.

---

## 20. Validation

Per-entity matrix: FS count vs PG count, missing, extra, orphans.

Semantic checks: category FKs, sold consistency, bid FKs, payment↔registration, auction current_player validity, purse formula report.

**Financial:** for each team `sum(sold_price)` vs `spent`.

---

## 21. Backup

- Firestore managed export / JSONL before cutover  
- Auth left intact  
- `pg_dump` after successful import  
- Railway env snapshot  
- 90-day retention recommended  

---

## 22. Rollback

| Stage | Action |
|-------|--------|
| Staging fail | Fix scripts; no prod impact |
| Import fail | Do not switch API |
| Post-switch critical fail | Redeploy last Firestore-backed API image |
| Success | Keep Firestore 30–90 days |

---

## 23. Cutover

**Maintenance freeze** (recommended):

1. Announce window  
2. Stop writes / maintenance mode  
3. Final Firestore export  
4. Import + gates  
5. Deploy Postgres API  
6. Smoke: login, list events, state read, registration dry-run  
7. Open traffic  
8. Monitor 72h  

Delta-only cutover is weak without universal `updated_at` — freeze preferred.

---

## 24. API Compatibility

Keep `/api/*` paths and Pydantic response shapes.

Internal: replace Firestore with repositories.

Document if fixing public `auction_state` multi-event bug changes edge behavior — prefer correct `event_id` filter with same JSON shape.

Verify TeamDashboard `/events` vs `/auctions` against production traffic before changing.

---

## 25. Frontend Architecture (target)

```
frontend/src/
  app/ or keep pages/
  design-system/     # tokens shared with marketing where possible
  shell/             # AppShell, EventContextBar, PageHeader
  features/          # gradual extraction from monolithic pages
  marketing/         # existing
  lib/               # auth unchanged initially
```

No framework migration (no Next.js rewrite required for this plan).

---

## 26. Design System

From UI audit + brand:

- Deep navy foundations  
- **Crimson brand primary** (logo) for CTAs  
- Gold for purse/bid emphasis  
- Outfit/Inter (or single product font pair)  
- shadcn primitives re-themed  
- Status badges standardized  
- Ban full-page purple gradient + rainbow FABs  

---

## 27. Application Shell

Replace Navbar + FloatingMenu with:

- **AppShell:** sidebar + topbar + content  
- **EventContextBar:** event name, status, deep links  
- Role-aware nav (organizer vs team)  

Special layouts: Live control, Display, Public registration, Public team stats, Auth pages, Marketing.

---

## 28. Page-by-Page UI Redesign

| Priority | Pages |
|----------|-------|
| **A** | AppShell, AuctionControl, AuctionDisplay, TeamDashboard, PublicTeamStats, PublicPlayerRegistration, PlayerRegistrationManagement, PlayerManagement |
| **B** | SuperAdminDashboard, Event/Category/Team/Sponsor management, Analytics, Payments, Settings, Priority/Sold |
| **C** | Auth residual, marketing polish |
| **D** | Legal content, test routes |

Use scores and workflows from UI audit §3–5.

---

## 29. Live Auction UX

- Operator-first hierarchy: player card, timer, teams, controls  
- Fullscreen mode  
- Restyle wheel (not casino)  
- Display: TV typography, no chrome  
- Depends on transactional API (Workstream A done for bid/sell)

---

## 30. Registration UX

- Multi-step: profile → documents → payment → confirm  
- Preserve payment return + sessionStorage contract until intentionally redesigned with tests  
- Mobile-first  

---

## 31. Team Owner UX

- Unify mental model between `/team` and public token view  
- Clear purse, safe bid, current player, confirm bid  
- Remove debug residue on public stats  

---

## 32. Responsive Design

- Registration + team owner: mobile-first  
- Operator control: desktop-first, usable tablet  
- Tables → card fallbacks on small screens  
- Breakpoints: 320 / 768 / 1024 / 1280 / 1440  

---

## 33. Accessibility

- Focus states, contrast on dark navy  
- Not color-only status  
- Keyboard for dialogs/menus  
- `prefers-reduced-motion`  
- Labels on all form controls  

---

## 34. State Management

- Keep page-local state + axios initially (minimize risk)  
- Optional React Query later for polling cache — **not required for migration**  
- No Redux mandate  

---

## 35. Component Architecture

Promote: AppShell, DataTable, StatCard, StatusBadge, PlayerCard, TeamPurseCard, BidPanel, AuctionTimer, Empty/Loading/Error, re-themed Button/Input.

Extract presentational pieces from AuctionControl **after** storage port or behind feature flags carefully.

---

## 36. Testing

| Layer | Coverage |
|-------|----------|
| Unit | models, calculator, transformers |
| Integration | CRUD, reg+payment, bid concurrency, sell, tokens, analytics |
| Migration | counts, sample equality, purse report |
| E2E staging | create event → categories → team → player → start → bid → sell; paid reg |
| UI | visual smoke on Priority A after redesign phases |

---

## 37. Performance

- Indexes §7.2  
- Join players by event_id post-backfill (internal)  
- Connection pool for 4 workers  
- Frontend: keep marketing image optimization; code-split large pages if safe later  

---

## 38. Security

- Secrets in Railway only  
- Public tokens unique + expiry  
- Parameterized SQL only  
- PII in payments restricted to authorized roles  
- No secret logging in migration reports  

---

## 39. Workstream Dependencies

| Workstream | Depends on |
|------------|------------|
| A1 Inventory | Access to Firestore read |
| A2 Schema + Alembic staging | A1 |
| A3 ETL + reconcile | A2 |
| A4 API port staging | A3 |
| A5 Concurrency hardening | A4 |
| A6 Prod cutover | A5 + gates |
| B1 Design tokens | Can start late A4 |
| B2 AppShell | A4 stable responses |
| B3 Organizer pages | B2 |
| B4 Live/Reg/Team UX | A5 preferred |

---

## 40. Git Strategy

```
origin/master @ 2730a02
        ↓
feature/powerauction-platform-modernization   ← current planning branch
        ↓
  (optional sub-branches)
  feature/db-staging-schema
  feature/db-api-port
  feature/ui-app-shell
```

Rules:

- No force-push to master  
- No mixing DB + live auction UI in one PR  
- Docs-first commits allowed on this branch  
- Production deploys only from reviewed merges  

---

## 41. Phased Roadmap

### Workstream A — Platform / Data

| Phase | Work | Exit |
|-------|------|------|
| A0 | Approve this plan | Sign-off |
| A1 | Read-only Firestore inventory | Counts + field stats |
| A2 | Staging Postgres + Alembic empty schema | Connected |
| A3 | ETL + backfill event_id + purse report | Gates green |
| A4 | Port FastAPI storage to Postgres (staging) | API parity tests |
| A5 | Transactional bid/sell | Concurrency tests |
| A6 | Prod freeze cutover | Smoke + 72h monitor |
| A7 | Firestore retain | 30–90 days |

### Workstream B — UI/UX (from UI audit, reordered)

| Phase | Work | Exit |
|-------|------|------|
| B1 | Design tokens + primitives | Storybook optional / app theme |
| B2 | AppShell + event context | Nav without FAB dependency |
| B3 | Dashboard + events + setup entities | Organizer IA |
| B4 | Players + registrations UI | Ops usable |
| B5 | Teams/purse UI | Clear economics |
| B6 | Live auction + display UI | Operator confidence |
| B7 | Team owner + public stats | Dual-entry polish |
| B8 | Analytics/settings | Trust |
| B9 | Responsive + a11y + perf pass | Gates |

---

## 42. File-by-File Plan (implementation later)

### Backend (illustrative target layout)

```
backend/
  app/
    main.py                 # from server:app entry evolution
    api/routes/*.py         # split server.py by domain
    core/config.py
    db/session.py
    models/                 # SQLAlchemy
    schemas/                # existing Pydantic (models.py split)
    services/               # bid, auction, registration
    auth/                   # middleware port
  alembic/
  scripts/                  # migration tools
  utils/base_price_calculator.py  # KEEP logic
```

Port order: config/db → users/events → categories/teams/players → registrations/payments → auction/bids → public tokens → analytics.

### Frontend

| Area | Files (current → change type) |
|------|-------------------------------|
| Shell | `Navbar.jsx`, `FloatingMenu.jsx` → new shell components |
| Live | `AuctionControl.jsx`, `AuctionDisplay.jsx`, `PlayerSpinner.jsx` | UI later |
| Team | `TeamDashboard.jsx`, `PublicTeamStats.jsx` | UI later |
| Reg | `PublicPlayerRegistration.jsx`, `PlayerRegistrationManagement.jsx` | UI later |
| Pool | `PlayerManagement.jsx`, `TeamManagement.jsx`, … | UI later |
| Marketing | `src/marketing/*` | minor alignment only |

---

## 43. Safety Gates

| Gate | Criterion |
|------|-----------|
| G1 | Inventory complete |
| G2 | Schema reviewed |
| G3 | Staging import counts match (0 missing critical) |
| G4 | event_id backfill report accepted |
| G5 | Purse discrepancy report accepted |
| G6 | FK/orphan checks pass |
| G7 | API contract tests pass |
| G8 | Bid concurrency tests pass |
| G9 | Payment flow staging pass |
| G10 | Critical UI workflows pass |
| G11 | Prod rehearsal pass |
| G12 | Explicit prod cutover approval |

**Failed gate = stop.**

---

## 44. Risk Register

| Risk | P | I | Mitigation | Detection | Rollback |
|------|---|---|------------|-----------|----------|
| Unknown FS fields | M | H | Inventory sampling | Field histogram | Extend schema |
| Missing player event_id | H | H | Category backfill + quarantine | Gate G4 | Manual map |
| Purse drift | H | H | sold_price SoT report | G5 | Manual adjust logged |
| Bid races | H | H | SQL locks | Concurrency tests | — |
| Payment PII/secrets | M | H | Env secrets; redaction | Review | Rotate keys |
| API shape drift | M | H | Contract tests | CI | Revert API |
| UI+DB mixed PR | M | H | Branch policy | Review | Split PR |
| Public token expiry | L | M | Import all; enforce expiry | Tests | — |
| Multi-worker pool exhaustion | M | M | Pool tuning | Metrics | Scale workers/pool |
| Maintenance overtime | M | M | Dress rehearsal | Dry-run timing | Extend window / abort |

---

## 45. Open Questions (human only)

1. Approve **maintenance window** length for prod freeze?  
2. Firestore retention after cutover: **30 / 90 / 180 days**?  
3. Staging: separate Firebase project or shared Auth?  
4. Accept **spent/remaining recompute** from sold players as bugfix during API port?  
5. Production Firestore **read credentials** available for inventory script?  
6. Confirm production use of TeamDashboard path `/events` vs `/auctions`?  

*(Repository-answerable items intentionally omitted.)*

---

## 46. Recommended Next Action

**Immediate (still no production changes):**

1. **Approve** this master plan (esp. purse policy, freeze cutover, branch).  
2. Commit `docs/*` on `feature/powerauction-platform-modernization`.  
3. Implement **only** read-only `firestore_inventory.py` + run against prod with read credentials → attach counts to §5.  
4. Create **Railway staging Postgres** (not production) after G1.  
5. Alembic empty schema + dry-run ETL on staging.  

**Do not** start AuctionControl UI rewrite or production DB until G7–G8 pass on staging.

---

## Appendix A — Source document map

| Topic | Primary source |
|-------|----------------|
| Routes, UI scores, shell IA | UI_UX_REDESIGN_AUDIT |
| Collections, schema, cutover, concurrency | FIRESTORE_TO_POSTGRES_MIGRATION_PLAN |
| Unified sequencing, gates, git, purse SoT | This document |

## Appendix B — Explicit non-claims

This planning work:

- Did **not** migrate data  
- Did **not** create Railway Postgres  
- Did **not** modify application code  
- Did **not** change Firebase/Cashfree/production  
- **Did** create git branch `feature/powerauction-platform-modernization` from `origin/master`  

---

**End of master plan.**
