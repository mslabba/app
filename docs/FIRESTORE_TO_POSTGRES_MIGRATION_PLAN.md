# PowerAuction — Architecture Modernization & Firestore → PostgreSQL Migration Plan

**Status:** Planning only — no code, database, production, or Firebase changes.  
**Date:** 2026-08-09  
**Companion document:** `docs/UI_UX_REDESIGN_AUDIT.md`  
**Source of truth:** Repository inspection (`backend/server.py`, `models.py`, `auth_middleware.py`, `firebase_config.py`, frontend API usage)

---

## 1. Executive Summary

PowerAuction is a FastAPI + React sports auction platform. **Application data lives in Firebase Firestore**; **identity lives in Firebase Auth**; **media URLs point to Cloudinary**; **registration payments use Cashfree**; **backend deploys on Railway**; **frontend deploys on GitHub Pages**.

### Recommendation

| Decision | Recommendation |
|----------|----------------|
| Primary app database | **PostgreSQL on Railway** |
| Auth (phase 1) | **Keep Firebase Auth** temporarily; map `firebase_uid` → `users.id` |
| ORM | **SQLAlchemy 2.x (sync first)** + **Alembic** |
| API strategy | **Preserve existing REST contracts** where possible; replace Firestore calls inside FastAPI only |
| Real-time | **Keep polling initially**; optional SSE later — **not required for DB cutover** |
| Dual-write | **Not required** if cutover uses short maintenance window + final delta export |
| UI redesign | **Separate workstream** after staging API is stable on Postgres |

### Why this project exists

Firestore is document-oriented, weakly constrained, and poorly suited to PowerAuction’s **relational** domain (events → teams/players/bids/payments) and **money-sensitive concurrent bidding**. PostgreSQL provides foreign keys, transactions, indexes, and reliable cutover/backup patterns on Railway.

### Non-negotiables

1. **Zero intentional data loss**  
2. **Preserve historical auction outcomes** (sold/unsold, prices, bids, payments)  
3. **Do not change auction rules / safe-bid formulas / Cashfree behavior** in migration  
4. **Do not delete Firestore** until long after successful production cutover  
5. **Do not implement** until this plan is approved  

---

## 2. Current Architecture

### 2.1 Verified stack (re-checked)

| Layer | Technology | Evidence |
|-------|------------|----------|
| Frontend | React 19, CRA + CRACO, React Router 7, Tailwind 3, Radix/shadcn UI, Lucide, Sonner | `frontend/package.json` |
| Backend | FastAPI, Pydantic v2, Uvicorn/Gunicorn workers | `backend/requirements.txt`, `railway.json`, `Procfile` |
| Auth | Firebase Auth (client) + Firebase Admin `verify_id_token` (server) | `lib/firebase.js`, `auth_middleware.py` |
| App data | **Google Cloud Firestore** via `firebase_admin` + `firestore.client()` | `firebase_config.py`, `server.py` |
| Media | Cloudinary (URLs stored as strings on entities) | frontend upload components; backend image helpers |
| Payments | Cashfree PG (order create + verify) | `server.py` payment routes |
| Deploy backend | Railway (Nixpacks, Gunicorn 4 workers) | `backend/railway.json` |
| Deploy frontend | GitHub Pages (`gh-pages`) | `frontend/package.json` deploy scripts |

### 2.2 Runtime topology (today)

```
Browser (GitHub Pages)
  → Firebase Auth (identity tokens)
  → FastAPI on Railway  (/api/*)
       → Firestore (all app state)
       → Cashfree (payments)
       → Zoho SMTP (password reset emails; tokens in-memory)
  → Cloudinary (direct uploads from browser; URLs saved via API)
```

### 2.3 Backend shape (today)

- Monolithic `backend/server.py` (~3.6k lines) with all routes and Firestore access.  
- Models: `backend/models.py` (Pydantic API/domain models, **not** ORM).  
- Auth deps: `require_super_admin`, `require_event_organizer`, `require_team_admin` (roles read from Firestore `users` doc, fallback token claims).  
- Safe-bid logic: `backend/utils/base_price_calculator.py` (must preserve behavior).  

### 2.4 What is *not* in Firestore

| Concern | Where it lives |
|---------|----------------|
| Password reset tokens | In-memory dict in `email_service` (ephemeral) |
| Firebase Auth accounts | Firebase Auth service |
| Image binary files | Cloudinary |
| Frontend env secrets | GitHub Pages build env / Railway env |

---

## 3. Current Firestore Data Inventory

Collections were discovered exclusively from code references to `db.collection('...')`.

### 3.1 Collection summary

| # | Collection | Doc ID strategy | Purpose | Actively used |
|---|------------|-----------------|---------|---------------|
| 1 | `users` | **Firebase UID** | Profile, role, team assignment | Yes |
| 2 | `events` | **UUID v4** | Auctions/leagues | Yes |
| 3 | `categories` | **UUID v4** | Player categories per event | Yes |
| 4 | `teams` | **UUID v4** | Franchises + purse | Yes |
| 5 | `players` | **UUID v4** | Auction pool + sold state | Yes |
| 6 | `player_registrations` | **UUID v4** | Public registration applications | Yes |
| 7 | `sponsors` | **UUID v4** | Event sponsors | Yes |
| 8 | `auction_state` | **`auction_{event_id}`** | Live auction cursor + recent bids | Yes |
| 9 | `bids` | **UUID v4** | Bid records (history) | Yes |
| 10 | `public_team_tokens` | **Firestore auto-ID** (`.add()`) | Shareable team dashboard tokens | Yes |
| 11 | `payment_orders` | **Cashfree `order_id` string** | Registration payment lifecycle | Yes |
| 12 | `bank_details` | UUID (create) / existing doc (update) | Organizer bank/UPI | Yes |
| 13 | `payment_gateway_settings` | Intended fixed: `payment_gateway_config` | Cashfree platform credentials | Yes |

No subcollections were found in code. Structure is **flat top-level collections** with foreign-key-like string fields.

---

### 3.2 Per-collection field inventory

#### `users`

| Field | Type (as used) | Notes |
|-------|----------------|-------|
| `uid` | string | Same as document ID; Firebase Auth UID |
| `email` | string | |
| `role` | string enum | `super_admin`, `event_organizer`, `team_admin`, (+ model has `auctioneer`, `viewer`) |
| `display_name` | string | |
| `mobile_number` | string? | |
| `team_id` | string? | FK-like to `teams` |
| `created_at` | ISO string | |

**Relationships:** `team_id` → team; roles gate API.  
**ID usage:** Auth middleware + frontend profile; must preserve Firebase UID mapping.

---

#### `events` (API name: auctions)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID string | Doc ID |
| `name`, `date`, `description` | string | |
| `status` | enum string | `not_started`, `in_progress`, `paused`, `completed` |
| `rules` | nested object | `min_squad_size`, `max_squad_size`, `min_bid_increment`, `max_foreign_players`, `timer_duration`, `rtm_cards_per_team` |
| `logo_url`, `banner_url` | string URL? | Cloudinary |
| `created_at` | ISO string | |
| `created_by` | Firebase UID | Organizer |
| `organizer_name`, `organizer_mobile` | string? | Denormalized |
| `payment_settings` | nested | `collect_payment` bool, `registration_fee` int? |
| `has_registration_limit` | bool | |
| `registration_limit` | int? | |

**Historical:** Event status transitions stored as current value only (no audit log of status changes).  
**URLs:** `/admin/*/:eventId`, `/auctions/:eventId/register`, `/display/:eventId`.

---

#### `categories`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Doc ID |
| `name`, `description` | string | |
| `event_id` | UUID | FK → events |
| `min_players`, `max_players` | int | Squad category constraints |
| `color` | string | UI |
| `base_price` | int | May also see legacy `base_price_min` in reads |

**Relationships:** Players belong to category; event players listed **via categories**, not `players.event_id`.

---

#### `teams`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Doc ID |
| `name` | string | |
| `event_id` | UUID | FK → events |
| `budget`, `spent`, `remaining` | int | Purse economics |
| `max_squad_size` | int | |
| `logo_url`, `color` | string? | Media / UI |
| `admin_uid` | Firebase UID? | Team owner |
| `admin_email` | string? | |
| `players_count` | int | Often recomputed from sold players |

**Historical:** `spent`/`remaining` are current aggregates; sold players hold line-item history via `sold_price`.

---

#### `players`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Doc ID |
| `name` | string | |
| `category_id` | UUID | FK → categories (**primary event linkage**) |
| `base_price` | int | |
| `current_price` | int? | |
| `photo_url` | string? | Cloudinary |
| `age`, `position`, `specialty` | optional | |
| `stats` | nested object | matches, runs, wickets, goals, assists, custom |
| `status` | enum | `available`, `sold`, `unsold`, `current` |
| `sold_to_team_id` | UUID? | FK → teams |
| `sold_price` | int? | Historical sale price |
| `previous_team`, `cricheroes_link`, `contact_number` | optional | |
| `district`, `identity_proof_url` | optional | From registration |
| `is_priority` | bool | Wheel priority |
| `event_id` | **inconsistent** | Some queries filter `players.event_id`; **create/approve paths often omit it** |

**Historical auction results live primarily here:** `status`, `sold_to_team_id`, `sold_price`.  
**Risk:** Migrate as-is; backfill `event_id` from category during migration.

---

#### `player_registrations`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Doc ID |
| `event_id` | UUID | |
| `status` | string | `pending_approval`, `approved`, `rejected` (as used) |
| `registered_at` | ISO | |
| `payment_order_id` | string? | FK → payment_orders |
| Profile fields | same family as player create | name, age, position, stats, photo_url, email, etc. |
| `approved_at`, `player_id` | on approve | Links to created player |
| Reject path | updates status | May store reason depending on code path |

**Historical:** Full registration trail for applicants (including rejected/pending).

---

#### `sponsors`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `event_id` | UUID | |
| `name`, description, website, contacts, address | | |
| `logo_url` | Cloudinary | |
| `sponsorship_amount` | int? | |
| `tier` | string | platinum/gold/silver/bronze |
| `is_active` | bool | |
| `created_at` | optional | |

---

#### `auction_state`

| Field | Type | Notes |
|-------|------|-------|
| Doc ID | `auction_{event_id}` | Deterministic |
| `id`, `event_id` | string | |
| `current_player_id` | UUID? | |
| `current_bid` | int? | |
| `current_team_id`, `current_team_name` | | Highest bidder |
| `timer_started_at` | ISO? | |
| `timer_duration` | int | Default 60 |
| `status` | auction status | |
| `bid_history` | **array of bid objects** | **Only last 10 retained** on place-bid |

**Limitation:** Live array is truncated; **full history is `bids` collection**, not this array.

---

#### `bids`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Doc ID |
| `player_id`, `event_id`, `team_id` | UUID | |
| `team_name` | denormalized | |
| `amount` | int | |
| `timestamp` | ISO | |

**This is the durable bid ledger** for historical reconstruction.

---

#### `public_team_tokens`

| Field | Type | Notes |
|-------|------|-------|
| Doc ID | auto | Not used in queries |
| `token` | string | URL query secret |
| `team_id` | UUID | |
| `expires_at` | datetime | Firestore timestamp/datetime |
| `created_at` | datetime | |
| `created_by` | UID | |

**URLs:** `/public/team/:teamId/stats?token=...`

---

#### `payment_orders`

| Field | Type | Notes |
|-------|------|-------|
| Doc ID | `order_id` | e.g. `order_{event8}_{uuid8}` |
| `order_id` | string | Cashfree order id |
| `event_id` | UUID | |
| `customer_name`, `email`, `phone` | | |
| `amount`, `currency` | | INR |
| `status` | string | PENDING, PAID/SUCCESS, etc. |
| `payment_session_id` | string | Cashfree |
| `created_at`, `verified_at` | ISO | |
| `transaction_id` | Cashfree cf_order_id | |
| `registration_completed` | bool | |
| `registration_id` | UUID? | After registration |

**Do not store Cashfree secret keys here** (those are in gateway settings).

---

#### `bank_details`

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `user_id` | Firebase UID | One per user pattern |
| bank fields | name, account, IFSC, SWIFT, branch, UPI | |
| `created_at`, `updated_at` | ISO | |

---

#### `payment_gateway_settings`

| Field | Type | Notes |
|-------|------|-------|
| Read path | document `payment_gateway_config` | Hard-coded in get/verify/create-order |
| Write path | may use generated `settings_id` | **Inconsistency risk in existing code** |
| Fields | `cashfree_app_id`, `cashfree_secret_key`, `cashfree_mode`, timestamps, `updated_by` | **Secrets** |

**Migration:** Move secrets to **Railway env vars** preferred; DB may store encrypted metadata or mode only. Plan should not leave secrets unencrypted in Postgres.

---

### 3.3 Data model quirks (must handle)

1. **Players lack reliable `event_id`** on create/approve; event is via `category_id → categories.event_id`.  
2. **Some auction queries use `players.event_id`** — may return incomplete sets if field missing.  
3. **`auction_state.bid_history` is not full history** (last 10).  
4. **Team purse fields can desync** until list endpoints recompute from sold players.  
5. **`public_team_tokens` uses `.add()`** — multiple tokens per team possible.  
6. **Payment gateway document ID inconsistency** between read and write paths.  
7. **No organizations table** — multi-tenancy is `events.created_by`.  
8. **Analytics computes on the fly** from teams/players (no analytics collection).  

---

## 4. Recommended Target Architecture

```
[ Browser ]
    | Firebase Auth (keep phase 1)
    | JWT Bearer
    v
[ FastAPI on Railway ]  ← same /api routes
    | SQLAlchemy
    v
[ PostgreSQL on Railway ]  ← application data
    |
    +→ Cashfree (unchanged)
    +→ Cloudinary URLs (unchanged)
    +→ Firebase Auth Admin (token verify only)
```

Optional later (not required for migration):

- Redis (rate limiting / optional pub-sub)  
- Background worker (exports, email)  

**Do not add** Redis/WebSockets solely for cutover.

---

## 5. PostgreSQL Architecture

### 5.1 Why PostgreSQL (fit analysis)

| Need | Firestore | PostgreSQL |
|------|-----------|------------|
| Relational event → teams → players → bids | Manual string refs, no FK integrity | Native FKs |
| Concurrent bid + purse updates | Partial transactions; race on `place_bid` | `SELECT FOR UPDATE`, ACID |
| Aggregations (analytics, spend) | Client-side / multi-reads | SQL aggregates + indexes |
| Hosting with existing Railway backend | Separate Google cloud | **Same platform**, `DATABASE_URL` |
| Backups / point-in-time | Export-oriented | Railway managed backups |
| Schema evolution | Ad hoc fields | Alembic migrations |

**PostgreSQL is the best fit.** Alternatives (MongoDB, MySQL) add less value: domain is relational; Railway Postgres is first-class; team already on Railway.

### 5.2 Railway PostgreSQL service

- Add **PostgreSQL** plugin to existing Railway project.  
- Environments: **staging** DB + **production** DB (separate).  
- Connection: `DATABASE_URL` (Railway injects).  
- Pooling: SQLAlchemy `pool_size` tuned for **Gunicorn 4 workers** (e.g. pool_size 5–10 per process, or PgBouncer if needed later).  
- SSL: enable as Railway requires.  
- Backups: enable Railway automatic backups; periodic `pg_dump` to private storage for cutover.  

### 5.3 Driver / ORM / migrations

| Piece | Choice | Why |
|-------|--------|-----|
| Driver | `psycopg` (v3) or `psycopg2-binary` | Mature, Railway-friendly |
| ORM | **SQLAlchemy 2.0** sync | Matches current sync Firestore usage; simpler cutover than full async rewrite |
| Migrations | **Alembic** | Versioned schema |
| Optional later | async SQLAlchemy + asyncpg | Only after stable cutover |

**Not recommended now:** raw SQL only, Django ORM, Prisma, or rewriting FastAPI to async-only.

### 5.4 Connection management

```
Gunicorn workers (4)
  └── each has Engine + SessionLocal
        └── pool_pre_ping=True
        └── pool_recycle=1800
```

Session scope: per-request dependency `get_db()` → commit/rollback.

### 5.5 Environment variables (proposed)

```
DATABASE_URL=postgresql://...
FIREBASE_CREDENTIALS_JSON=...          # keep for Auth
FIREBASE_PROJECT_ID=...
CASHFREE_APP_ID=...                    # prefer env over DB secrets
CASHFREE_SECRET_KEY=...
CASHFREE_MODE=sandbox|production
CLOUDINARY_*                           # frontend/backend as today
FRONTEND_URL=...
BACKEND_URL=...
APP_ENV=staging|production
```

### 5.6 Staging vs production

| Env | Backend | DB | Firebase | Cashfree |
|-----|---------|-----|----------|----------|
| Staging | Railway staging service | Staging Postgres | Same project or separate Firebase project | Sandbox |
| Production | Current Railway service | Production Postgres | Production Firebase Auth | Production when live |

---

## 6. Proposed Database Schema

### 6.1 Design principles

1. **Preserve external IDs** as primary keys where they appear in URLs/APIs (UUID strings).  
2. **Normalize** relationships; use **JSONB** for stats and event rules only.  
3. **Money as integer** (minor units / whole rupees as currently used — keep int consistency with existing API).  
4. **Timestamps** as `timestamptz`.  
5. **Soft constraints** for historical orphan risk during import; enforce FKs after clean import.  

### 6.2 Tables (proposed)

| Table | PK | Notes |
|-------|-----|------|
| `users` | `id` TEXT (= firebase_uid) | Auth profile mirror |
| `events` | `id` UUID/TEXT | Auctions |
| `event_rules` | `event_id` PK/FK | Or JSONB column on events (prefer JSONB to match API `rules`) |
| `categories` | `id` | |
| `teams` | `id` | |
| `players` | `id` | Includes sold_* historical fields + denormalized `event_id` |
| `player_registrations` | `id` | |
| `sponsors` | `id` | |
| `auction_states` | `event_id` PK | Replaces `auction_{id}` doc |
| `bids` | `id` | Full history |
| `public_team_tokens` | `id` UUID | Token unique |
| `payment_orders` | `order_id` TEXT PK | |
| `bank_details` | `id` | unique(user_id) |
| `platform_settings` | `key` | Non-secret settings only |
| `id_mappings` (migration) | (collection, firestore_id) | Optional audit |
| `migration_runs` | id | Ops logging |

**JSONB columns:** `events.rules`, `events.payment_settings`, `players.stats`, registration stats.

**Do not create** separate tables for analytics snapshots unless product later requires them (currently computed).

### 6.3 Key columns (illustrative)

```sql
-- users
id TEXT PRIMARY KEY,              -- firebase_uid
email TEXT NOT NULL UNIQUE,
role TEXT NOT NULL,
display_name TEXT,
mobile_number TEXT,
team_id TEXT REFERENCES teams(id),
created_at TIMESTAMPTZ

-- events
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
date TEXT,                        -- keep string if API uses string dates
status TEXT NOT NULL,
rules JSONB NOT NULL DEFAULT '{}',
payment_settings JSONB NOT NULL DEFAULT '{}',
logo_url TEXT, banner_url TEXT,
created_by TEXT REFERENCES users(id),
organizer_name TEXT, organizer_mobile TEXT,
has_registration_limit BOOLEAN,
registration_limit INT,
created_at TIMESTAMPTZ

-- categories
id TEXT PRIMARY KEY,
event_id TEXT NOT NULL REFERENCES events(id),
name TEXT NOT NULL,
description TEXT,
min_players INT, max_players INT,
color TEXT, base_price INT NOT NULL

-- teams
id TEXT PRIMARY KEY,
event_id TEXT NOT NULL REFERENCES events(id),
name TEXT NOT NULL,
budget INT NOT NULL, spent INT NOT NULL DEFAULT 0,
remaining INT NOT NULL,
max_squad_size INT,
logo_url TEXT, color TEXT,
admin_uid TEXT REFERENCES users(id),
admin_email TEXT,
players_count INT DEFAULT 0

-- players
id TEXT PRIMARY KEY,
event_id TEXT NOT NULL REFERENCES events(id),  -- BACKFILLED
category_id TEXT NOT NULL REFERENCES categories(id),
name TEXT NOT NULL,
base_price INT NOT NULL,
current_price INT,
photo_url TEXT, age INT, position TEXT, specialty TEXT,
stats JSONB,
status TEXT NOT NULL,
sold_to_team_id TEXT REFERENCES teams(id),
sold_price INT,
previous_team TEXT, cricheroes_link TEXT, contact_number TEXT,
district TEXT, identity_proof_url TEXT,
is_priority BOOLEAN DEFAULT FALSE

-- player_registrations
id TEXT PRIMARY KEY,
event_id TEXT NOT NULL REFERENCES events(id),
status TEXT NOT NULL,
registered_at TIMESTAMPTZ,
payment_order_id TEXT,
player_id TEXT REFERENCES players(id),
approved_at TIMESTAMPTZ,
-- profile columns + stats JSONB ...

-- bids
id TEXT PRIMARY KEY,
event_id TEXT NOT NULL REFERENCES events(id),
player_id TEXT NOT NULL REFERENCES players(id),
team_id TEXT NOT NULL REFERENCES teams(id),
team_name TEXT,
amount INT NOT NULL,
created_at TIMESTAMPTZ NOT NULL

-- auction_states
event_id TEXT PRIMARY KEY REFERENCES events(id),
current_player_id TEXT REFERENCES players(id),
current_bid INT,
current_team_id TEXT REFERENCES teams(id),
current_team_name TEXT,
timer_started_at TIMESTAMPTZ,
timer_duration INT DEFAULT 60,
status TEXT NOT NULL
-- bid_history NOT stored as truncated array; use bids table

-- payment_orders
order_id TEXT PRIMARY KEY,
event_id TEXT NOT NULL REFERENCES events(id),
customer_name TEXT, customer_email TEXT, customer_phone TEXT,
amount INT NOT NULL, currency TEXT DEFAULT 'INR',
status TEXT NOT NULL,
payment_session_id TEXT,
transaction_id TEXT,
registration_completed BOOLEAN DEFAULT FALSE,
registration_id TEXT,
created_at TIMESTAMPTZ, verified_at TIMESTAMPTZ

-- public_team_tokens
id UUID PRIMARY KEY,
token TEXT NOT NULL UNIQUE,
team_id TEXT NOT NULL REFERENCES teams(id),
expires_at TIMESTAMPTZ NOT NULL,
created_at TIMESTAMPTZ,
created_by TEXT
```

### 6.4 Constraints & indexes (driven by real queries)

| Query pattern (code) | Index |
|----------------------|--------|
| events by `created_by` | `(created_by, created_at DESC)` |
| categories by event | `(event_id)` |
| teams by event | `(event_id)` |
| players by category | `(category_id)` |
| players by event (after backfill) | `(event_id, status)` |
| players by sold_to_team_id + status | `(sold_to_team_id, status)` |
| registrations by event + status | `(event_id, status)` |
| bids by event / player | `(event_id, created_at)`, `(player_id, created_at)` |
| payments by event | `(event_id, created_at)` |
| tokens by token (+ team) | `UNIQUE(token)`, `(team_id)` |
| users by email | `UNIQUE(email)` |
| users by role / team_id | `(role)`, `(team_id)` |

---

## 7. Entity Relationship Diagram (textual)

```
users (firebase_uid)
  │ created_by
  ▼
events ──────────────────────────────┐
  │                                  │
  ├── categories ──► players ──► sold_to_team_id ──► teams
  │       │              │                              │
  │       │              └──◄── bids ───────────────────┘
  │       │                      │
  │       │                      └── event_id ──► events
  │       │
  ├── teams ── admin_uid ──► users
  │     └── public_team_tokens
  │
  ├── player_registrations ── payment_order_id ──► payment_orders
  │         └── player_id (on approve) ──► players
  │
  ├── sponsors
  │
  └── auction_states (1:1)

payment_orders.event_id ──► events
bank_details.user_id ──► users
```

**No Organization entity today.** Future multi-org would sit above `events.created_by` / membership table — **out of scope for data migration**.

---

## 8. Firestore → PostgreSQL Mapping

| Firestore collection | PostgreSQL | Transform notes |
|----------------------|------------|-----------------|
| `users` | `users` | PK = uid |
| `events` | `events` | `rules` + `payment_settings` → JSONB |
| `categories` | `categories` | Map legacy `base_price_min` → `base_price` if present |
| `teams` | `teams` | Recompute spent/remaining optionally after load |
| `players` | `players` | **Backfill `event_id` from category**; keep sold fields |
| `player_registrations` | `player_registrations` | Preserve all statuses |
| `sponsors` | `sponsors` | |
| `auction_state` | `auction_states` | Parse `auction_{event_id}` → `event_id`; **drop truncated bid_history** or import as non-authoritative |
| `bids` | `bids` | Authoritative history |
| `public_team_tokens` | `public_team_tokens` | New UUID PK; preserve token string |
| `payment_orders` | `payment_orders` | PK = order_id |
| `bank_details` | `bank_details` | |
| `payment_gateway_settings` | **env vars** (+ optional `platform_settings` without secrets) | Prefer not storing secrets in DB |

**Nested → JSONB:** stats, rules, payment_settings.  
**Arrays → child table:** `bid_history` should **not** be primary store; use `bids`.  
**Denormalized names** (`team_name` on bids): keep for history even if team renamed later.

---

## 9. Existing ID Migration Strategy

### 9.1 IDs that appear outside the DB

| ID type | Used in |
|---------|---------|
| Firebase UID | JWT, `users` doc id, `created_by`, `admin_uid` |
| Event UUID | Routes `/admin/.../:eventId`, `/auctions/:eventId/register`, `/display/:eventId` |
| Team UUID | Routes, public stats URLs |
| Player UUID | Auction control, sell, bids |
| Registration UUID | Approve/reject routes |
| Bid UUID | Bid records |
| Payment `order_id` | Cashfree + return URLs + verification |
| Public token | Query string (not Firestore doc id) |
| Auction state id | `auction_{event_id}` (derivable) |

### 9.2 Strategy: **preserve string IDs as PKs**

- Use `TEXT` / UUID-as-text primary keys matching existing document IDs.  
- **Do not generate new surrogate integers for domain entities** in v1.  
- For `public_team_tokens`, generate new internal UUID PK but **keep `token` value unchanged**.  
- Maintain optional `migration_id_map` table for audit: `(source_collection, source_id, target_table, target_id, migrated_at)`.

### 9.3 Referential integrity import order

1. users  
2. events  
3. categories  
4. teams (admin_uid may null if user missing — log)  
5. players (event_id backfill)  
6. player_registrations  
7. sponsors  
8. bids  
9. auction_states  
10. payment_orders  
11. public_team_tokens  
12. bank_details  

Then: validate FKs; fix orphans with report (do not drop historical sold players).

---

## 10. Authentication Strategy

### Current behavior

- Register: Firebase Auth user + Firestore `users` doc + custom claims.  
- Login: Firebase client SDK → ID token → `Authorization: Bearer`.  
- Backend: `verify_id_token` + role from Firestore `users`.  
- Google sign-in supported on frontend.  
- Password reset: custom backend email tokens (in-memory), not Firestore.

### Recommendation: **OPTION A — Keep Firebase Auth for migration**

| Pros | Cons |
|------|------|
| Zero user password/Google migration risk | Continues Firebase dependency for identity |
| JWT verification already works | Two systems (Auth + Postgres profiles) |
| Matches “preserve users” requirement | Later dual-system complexity |

**OPTION B** (full auth migration) is a **separate project** after Postgres is stable.

### Mapping

```
Firebase Auth UID  ==  users.id (Postgres)  ==  current Firestore users.uid
```

Backend after migration: verify Firebase token → load role/team from **Postgres `users`**, not Firestore.

---

## 11. Authorization Strategy

### CURRENT BEHAVIOR (do not change in migration)

| Role | Backend | Frontend |
|------|---------|----------|
| `super_admin` | Full | `/admin/*` |
| `event_organizer` | Event-scoped ownership checks | Treated like super admin for route access (`requireSuperAdmin` flag allows organizers) |
| `team_admin` | Bid + team association | `/team` |
| `auctioneer`, `viewer` | Enum exists | **Not first-class in frontend routing** |
| Player | No account | Public registration only |

Ownership: many routes call `check_event_ownership` (event.created_by == uid, or super_admin).

### RECOMMENDED FUTURE (separate project)

- Distinct organizer vs super-admin UX.  
- First-class `auctioneer` role.  
- Optional org memberships.  
- **Do not implement during DB migration.**

---

## 12. Auction Transaction / Concurrency Strategy

### CURRENT BEHAVIOR (code facts)

| Operation | Atomicity today |
|-----------|-----------------|
| `POST /bids/place` | **Not transactional** — read state, write bid, update state separately → **race risk under concurrent bids** |
| `POST /bids/complete-transaction` | Firestore `@firestore.transactional` multi-doc update |
| `POST /players/{id}/sell` | Sequential updates (player, team, state) — weaker than full transaction |
| Safe-bid calculation | Read-only compute in Python (`base_price_calculator`) |

### TARGET BEHAVIOR (preserve rules, strengthen integrity)

**Do not change** validation formulas. **Do** wrap multi-document updates in one DB transaction:

```text
BEGIN;
  SELECT auction_states … FOR UPDATE;
  SELECT teams … FOR UPDATE;
  SELECT players … FOR UPDATE;
  -- validate bid amount / budget / status using EXISTING logic
  INSERT bids;
  UPDATE auction_states;
COMMIT;
```

Similarly for sell/finalize:

```text
BEGIN;
  lock player + team + auction_state;
  update player sold_*;
  update team spent/remaining/players_count;
  clear auction_state current_*;
COMMIT;
```

**Idempotency (optional enhancement, not formula change):**  
client request-id header for sell/bid to prevent double-submit — only if added carefully without API break; otherwise rely on state checks (`player.status != sold`).

**Gunicorn multi-worker:** row locks required; Firestore “last write wins” races are a known weakness to improve **without changing business rules**.

---

## 13. Real-Time Auction Strategy

### CURRENT

- **Polling** from `AuctionControl` (`setInterval` → `GET /auction/state/{eventId}`).  
- Team dashboard / display fetch state on load/interval patterns.  
- No WebSockets/SSE in codebase.

### RECOMMENDATION FOR MIGRATION

| Phase | Approach |
|-------|----------|
| DB cutover | **Keep polling** — zero new infra, preserves frontend |
| Later UX phase | Optional **SSE** channel `GET /auctions/{id}/stream` broadcasting state version after commits |

**Do not block migration on WebSockets.**  
If added later: publish after successful Postgres commit only.

Flow (future optional):

```
Operator action → DB transaction → commit → publish event_id → SSE/clients refresh
```

---

## 14. Payment Migration Strategy

### Current Cashfree flow

1. `POST /payments/create-order` → Cashfree API → store `payment_orders` PENDING  
2. Browser checkout  
3. Return URL with `order_id`  
4. `POST /payments/verify` → Cashfree status → update order  
5. `POST /auctions/{id}/register-player` requires PAID/SUCCESS + not already used  

### Postgres model

- Migrate **all** `payment_orders` rows as-is.  
- Keep `order_id` primary key (Cashfree correlation).  
- Do not re-create Cashfree orders.  
- Gateway secrets: **Railway env**, not plaintext DB (migrate config carefully).  

### Historical

All past PENDING/PAID/failed orders must import for reconciliation and registration links.

---

## 15. Cloudinary / Media Strategy

| Field | Entity |
|-------|--------|
| `photo_url` | players, registrations |
| `identity_proof_url` | registrations |
| `logo_url` / `banner_url` | events |
| `logo_url` | teams, sponsors |

**Do not re-upload media.**  
Migrate URL strings only.  
Validate URL non-null rates in report.  
No Cloudinary folder migration required.

---

## 16. Railway Infrastructure Plan

### Production (target)

| Service | Role |
|---------|------|
| `powerauction-api` (existing) | FastAPI |
| `powerauction-db` (new) | PostgreSQL |
| Firebase | Auth only (after cutover) |
| GitHub Pages | Frontend (unchanged) |

### Optional

| Service | When |
|---------|------|
| Redis | Only if rate-limit/SSE fanout needed later |
| One-off migration job | Run as Railway one-shot or local secure CI |

### Deployment order

1. Create **staging** Postgres  
2. Deploy API branch with Postgres backend to staging  
3. Migrate staging data  
4. Test  
5. Create **production** Postgres  
6. Maintenance window: final export → import → switch `DATABASE_URL` / release  
7. Keep Firestore credentials for rollback period  

### Health checks

- Existing `/health` extended later to check `SELECT 1` on Postgres (implementation phase).  

---

## 17. Migration Utility Design

### Proposed artifacts

```
backend/
  scripts/
    migrate_firestore_to_postgres.py   # orchestrator
    firestore_export.py                # optional JSONL dump
    reconcile_counts.py
    backfill_player_event_id.py
  app/db/…                             # future code layout
```

### Orchestrator steps

1. Connect Firestore (read-only).  
2. Connect Postgres staging/prod target.  
3. Write `migration_runs` row (start).  
4. Export each collection → transform → upsert by preserved PK.  
5. Backfill `players.event_id`.  
6. Rebuild team aggregates (optional consistency pass).  
7. FK validation.  
8. Count reconciliation.  
9. Write report JSON + logs.  
10. Mark run complete / failed.  

### Properties

| Property | Approach |
|----------|----------|
| Repeatable | Upsert on PK |
| Idempotent | Same IDs overwrite safely |
| Logged | Structured logs + report file |
| Resumable | Per-collection checkpoints in `migration_runs` |
| Non-destructive to source | **No Firestore deletes** |

### Mapping table

`id_mappings(source_collection, source_id, target_table, target_id, payload_hash, migrated_at)`

---

## 18. Data Validation & Reconciliation

### Count matrix (template)

| Entity | Firestore count | Postgres count | Missing | Extra | Orphans | Notes |
|--------|-----------------|----------------|---------|-------|---------|-------|
| users | | | | | | |
| events | | | | | | |
| categories | | | | | | |
| teams | | | | | | |
| players | | | | | | |
| registrations | | | | | | |
| sponsors | | | | | | |
| bids | | | | | | |
| auction_states | | | | | | |
| payment_orders | | | | | | |
| public_team_tokens | | | | | | |
| bank_details | | | | | | |

### Semantic checks

- Every `players.category_id` exists.  
- Every sold player has `sold_to_team_id` + `sold_price`.  
- Team `spent` ≈ sum(sold_price) for team (flag drift).  
- Every bid’s player/team/event exists.  
- Payment `registration_id` points to registration if set.  
- Approved registration has `player_id` present.  
- Auction state `current_player_id` null or valid.  
- No negative remaining budgets (flag).  
- Timestamp parse success rate 100%.  

### Sample financial check

```
For each event:
  sum(players.sold_price where status=sold)
  vs sum(teams.spent)
```

Differences logged, not auto-destroyed.

---

## 19. Backup Strategy

### Before any production cutover

1. **Firestore export** (Google managed export to GCS or full collection dump JSONL).  
2. **Firebase Auth** user export (if available) / ensure Auth untouched.  
3. **Postgres** `pg_dump` after successful import.  
4. **Env/config** backup (Railway variables snapshot).  
5. **Cashfree** no data export needed beyond `payment_orders`.  
6. Store backups offline with retention (e.g. 90 days).  

### Ongoing

- Railway automatic Postgres backups enabled.  
- Weekly logical dump for first month post-cutover.  

---

## 20. Rollback Strategy

| Stage | Rollback |
|-------|----------|
| Staging validation fails | Fix scripts; re-run; **no prod impact** |
| Prod import fails | Do not switch traffic; drop/recreate empty prod DB if needed |
| Prod API switched but critical errors | **Redeploy previous API image** still configured for Firestore; keep Postgres for forensics |
| Partial dual period | Prefer not dual-writing; rollback = old Firestore-backed release |

**Firestore remains intact throughout** — primary rollback path.

Rollback trigger examples: registration broken, bidding broken, >0.1% missing critical entities, payment verify failures.

---

## 21. Production Cutover Plan

### Recommended: **short maintenance window + final delta** (not dual-write)

Dual-write doubles complexity and bug surface for little gain at current scale.

```
T-7d:  Staging full migration + E2E
T-2d:  Dress rehearsal on prod snapshot → staging
T-0:
  1. Announce maintenance (e.g. 30–90 min)
  2. Put API in read-only or stop writes (feature flag / maintenance response)
  3. Final Firestore export
  4. Import + reconcile (must pass gates)
  5. Deploy Postgres-backed API
  6. Smoke tests (login, list events, one registration dry-run, auction state read)
  7. Open traffic
  8. Monitor 24–72h
T+14d…90d: Firestore retained read-only
T+90d: Decide retirement (separate approval)
```

### Delta strategy

If maintenance allows only one export:  
- Freeze writes → export → import → cutover.  

If must minimize downtime:  
- Export1 → import → freeze → export2 delta (by `created_at`/`updated_at` if fields exist; many docs lack `updated_at`) → **prefer freeze** because many entities lack reliable updated timestamps.

**Reality check:** Without universal `updated_at`, **dual-write or long freeze** is hard. **Maintenance freeze is safest for zero loss.**

---

## 22. API Compatibility Plan

### Preferred

```
Frontend (unchanged contracts)
  → FastAPI route signatures (same)
    → Service layer
      → SQLAlchemy / Postgres
```

### Keep stable

- Pathnames under `/api/...`  
- Pydantic response shapes in `models.py`  
- Status enums string values  
- Bid/safe-bid response fields  
- Payment order/verify shapes  

### Allowed internal changes

- Implementation of storage  
- Stronger transactional safety (same external validation errors)  

### Explicit API risks / quirks to preserve carefully

| Quirk | Note |
|-------|------|
| Frontend TeamDashboard may call `/events` vs `/auctions` | Verify and keep whatever is live |
| Public auction-state query historically `limit(1)` on collection | **Bug risk** multi-event; Postgres should use `event_id` correctly while matching public API payload |
| Payment gateway doc id | Normalize internally without breaking admin UI |

Document any unavoidable response field fixes in a short **API delta** appendix before release.

---

## 23. Testing Strategy

### Unit

- SQLAlchemy models  
- Alembic upgrade/downgrade  
- base_price_calculator (unchanged fixtures)  
- Bid validation helpers  

### Integration

- CRUD events/categories/teams/players  
- Registration + payment order state machine  
- Approve registration → player  
- place_bid concurrency test (two parallel bids)  
- sell / complete-transaction  
- public token auth  
- analytics numbers  

### Migration

- Full import on anonymized/prod snapshot  
- Reconciliation gates automated  
- Random sample field equality (N docs per collection)  

### E2E (staging)

1. Organizer creates event  
2. Categories + team + player  
3. Start auction → next player → bid → sell  
4. Registration unpaid + paid  
5. Team dashboard bid  
6. Display page state  

### Non-goals for migration tests

- Visual UI redesign acceptance (separate)

---

## 24. Security Review

| Area | Action |
|------|--------|
| `DATABASE_URL` | Railway secret; never commit |
| Firebase credentials | Keep in Railway secrets |
| Cashfree secrets | Prefer env over DB; rotate if ever logged |
| Public team tokens | Unique index; expiry enforced; rate-limit public endpoints later |
| JWT | Continue Firebase verification |
| SQL injection | ORM parameterized queries only |
| CORS | Keep existing FastAPI CORS config |
| Payment PII | customer email/phone in payment_orders — restrict admin access |
| Do not log secrets | Scrub migration logs |

---

## 25. Performance / Indexing Strategy

Indexes listed in §6.4 — derived from actual `.where()` patterns in `server.py`.

Additional notes:

- List players by event currently multi-queries categories then players — Postgres can `JOIN` once (internal optimization; API payload same).  
- Analytics currently scans players broadly — replace with filtered `WHERE event_id` after backfill.  
- Connection pool sized for 4 Gunicorn workers.  
- Avoid N+1 in new repository layer.  

**Do not** index every column.

---

## 26. UI/UX Redesign Dependency Plan

From `UI_UX_REDESIGN_AUDIT.md`:

| Priority | Relationship to DB migration |
|----------|------------------------------|
| Phase 1 Design system | Can proceed in parallel on frontend-only |
| App shell / pages | Prefer **after** staging API is Postgres-backed to avoid dual backends |
| Live auction UI (Priority A) | Depends on stable auction APIs; transactional backend is a **benefit** |
| Registration UI | Payment flow must remain identical |

**Order of value:**

1. Preserve functionality & data (this plan)  
2. Postgres backend cutover  
3. UI redesign against stable API  
4. Optional SSE / auth modernization  

**Rule:** Do not mix large UI rewrites with migration PRs.

---

## 27. Phased Implementation Roadmap

| Phase | Work | Exit criteria |
|-------|------|---------------|
| **P1** | Complete Firestore inventory + sample export from prod (read-only) | Collection counts known |
| **P2** | Finalize schema DDL + Alembic skeleton | Reviewed ERD |
| **P3** | Create Railway **staging** Postgres | Connection works |
| **P4** | SQLAlchemy models + session dependency | Models map 1:1 to schema |
| **P5** | Alembic migrations applied on staging | Empty schema ready |
| **P6** | Migration scripts (export/transform/load) | Dry-run on staging |
| **P7** | Initial full migration to staging | Counts match within tolerance 0 missing critical |
| **P8** | Reconciliation report + fix scripts | Gate green |
| **P9** | Port FastAPI routes off Firestore → Postgres (feature flag) | Staging API green |
| **P10** | Full functional + concurrency tests | Bid/sell/reg/payment pass |
| **P11** | Production cutover (maintenance) | Smoke pass |
| **P12** | Firestore read-only retention | 30–90 days |
| **P13** | Retire Firestore data plane (Auth may remain) | Separate approval |

**Improve vs generic plan:** Insert **player.event_id backfill** and **team aggregate recompute** as explicit substeps of P7–P8. Defer WebSockets.

---

## 28. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missing `players.event_id` | High | Backfill from categories; fix queries |
| Concurrent bid races today | High | Transactional place_bid on Postgres |
| Truncated bid_history | Medium | Prefer `bids` table as source of truth |
| Payment gateway secret handling | High | Env vars; never log |
| Multi-token public links | Medium | Import all; validate expiry |
| Gunicorn multi-worker races | High | Row locks |
| API quirks / dual endpoints | Medium | Compatibility tests |
| In-memory password reset tokens | Low | Unrelated to DB; remains |
| Analytics wrong if event_id wrong | High | Backfill validation |
| UI redesign distraction | Medium | Separate branches/milestones |
| Dual-write complexity | High | Prefer freeze cutover |

---

## 29. Open Questions

1. **Exact production document counts** per collection (need read-only export)?  
2. Are there **manual Firestore fields** not in code? (Run schema sampling on export.)  
3. Confirm whether **any production players have `event_id`** already.  
4. **Retention policy** for Firestore after cutover (30/90/180 days)?  
5. Brand/primary color for UI redesign is independent — confirm it stays decoupled.  
6. Is there a **staging Firebase** or only production?  
7. Accept **maintenance window** length for freeze cutover?  
8. Should `payment_gateway_settings` secrets move 100% to env in the same project? (Recommended yes.)  
9. Any **legal** need to retain rejected registrations longer? (They will be migrated regardless.)  
10. TeamDashboard `/events` vs `/auctions` — confirm production traffic.  

---

## 30. Recommended First Implementation Step

**Do not create production Postgres yet.**

### Step 0 (this week, still non-destructive)

1. Approve this plan (especially: preserve IDs, keep Firebase Auth, freeze cutover, no dual-write).  
2. Run a **read-only Firestore inventory script** (or console export) to capture **exact counts** and sample documents per collection → append real numbers to §18.  
3. Create **Railway staging PostgreSQL only** after approval.  
4. Implement **Alembic schema + migration dry-run on staging** before touching production data paths.

### Explicit first engineering deliverable (when approved)

> `docs` + staging-only: Alembic initial migration creating empty tables listed in §6, plus a **read-only** `scripts/firestore_inventory.py` that prints counts/field histograms — **no writes to Firestore, no production cutover**.

---

## Appendix A — Historical data preservation checklist

| Historical concern | Preserved via |
|--------------------|---------------|
| Registration applications | `player_registrations` all statuses |
| Payments | `payment_orders` all statuses |
| Bid attempts | `bids` full collection |
| Winning sale | `players.sold_*` + status |
| Unsold | `players.status=unsold` |
| Team spend | `teams.spent` + sold player sum |
| Live cursor | `auction_states` (current only) |
| Status change audit log | **Not present today** — cannot invent |
| Full live bid_history array | **Not fully present** (last 10) — use `bids` |

---

## Appendix B — Deliverables checklist (implementation phase)

- [ ] PostgreSQL schema (Alembic)  
- [ ] SQLAlchemy models  
- [ ] Firestore inventory + export tool  
- [ ] Transform/load tool  
- [ ] ID mapping / migration_runs  
- [ ] Reconciliation report generator  
- [ ] Staging API on Postgres  
- [ ] Concurrency-safe bid/sell transactions  
- [ ] Backup + rollback runbooks  
- [ ] Production cutover runbook  
- [ ] Automated tests listed in §23  
- [ ] Post-cutover monitoring checklist  

---

## Appendix C — Coordination with UI redesign

| UI phase (from UI audit) | Blocked on Postgres? |
|--------------------------|----------------------|
| Marketing polish | No |
| Design tokens / app shell | No (can use mocks) |
| Live auction UI overhaul | Prefer API stable on Postgres |
| Registration UX | Prefer payment paths verified on Postgres staging |

---

**Document end.**  
No code was modified, no databases created, no production systems changed, and no Firebase data was altered in producing this plan.
