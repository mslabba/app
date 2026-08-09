# PowerAuction — UI/UX Redesign Audit & Blueprint

**Status:** Planning only — no code, API, auth, payment, auction logic, or database changes.  
**Date:** 2026-08-09  
**Scope:** Full application (app + marketing)  
**Source of truth:** Actual repository inspection (`frontend/`, `backend/`, routes, models, components)

---

## Table of contents

1. [Discovery — architecture](#1-discovery--architecture)
2. [Route inventory](#2-route-inventory)
3. [Functionality map (code-backed)](#3-functionality-map-code-backed)
4. [Page quality audit](#4-page-quality-audit)
5. [Redesign priority](#5-redesign-priority)
6. [Shared components & design system inventory](#6-shared-components--design-system-inventory)
7. [Proposed UX / information architecture](#7-proposed-ux--information-architecture)
8. [Special-case layouts](#8-special-case-layouts)
9. [Proposed design system](#9-proposed-design-system)
10. [Phased redesign roadmap](#10-phased-redesign-roadmap)
11. [Risks, constraints, and recommendations](#11-risks-constraints-and-recommendations)

---

## 1. Discovery — architecture

### 1.1 Stack (verified)

| Layer | Technology |
|--------|------------|
| Frontend | React 19, CRA + CRACO, React Router 7, Tailwind 3, Radix/shadcn-style `components/ui/*`, Lucide, Sonner toasts |
| Auth (client) | Firebase Auth (email/password + Google) via `src/lib/firebase.js` + `AuthContext` |
| Auth (server) | Firebase Admin + Bearer JWT middleware (`auth_middleware.py`) |
| Backend | FastAPI (`backend/server.py`), Pydantic models (`models.py`) |
| Database | **Firestore** (via Firebase Admin) |
| Media | Cloudinary (upload/crop components) |
| Payments | Cashfree (order create + verify; gateway settings) |
| Marketing site | Parallel design system under `frontend/src/marketing/*` (navy/crimson) |
| App UI (dashboard) | Legacy purple gradient glassmorphism (`#667eea` → `#764ba2`) in almost every app page |
| Deploy | Backend: Railway; Frontend: GitHub Pages (`gh-pages` via `npm run deploy`) |

### 1.2 Frontend architecture

```
frontend/src/
  App.js                 # All routes
  pages/                 # Feature pages (monolithic, often 300–2400 lines)
  components/
    Navbar.jsx           # App chrome (organizer/admin)
    FloatingMenu.jsx     # FAB radial event navigation
    PlayerSpinner.jsx    # Wheel selection UI
    ImageUpload*.jsx, DocumentUpload.jsx, ImageCropper.jsx
    ProtectedRoute.jsx
    ui/*                 # shadcn primitives (button, card, dialog, table, …)
  marketing/             # Marketing redesign (separate visual system)
  lib/                   # AuthContext, firebase, cloudinary, utils
  utils/                 # PDF, Excel, image helpers
```

**Patterns:**

- Pages own data fetching (axios + `token` header) — little shared data layer.
- Layout is **copied per page**: `min-h-screen` + purple gradient + `<Navbar />` + optional `<FloatingMenu />`.
- No shared `AppShell` / sidebar layout component for the product app.
- Marketing and app UIs use **two incompatible design systems**.

### 1.3 Backend architecture

- Single FastAPI app, router prefix `/api`.
- Firestore collections for users, auctions/events, categories, teams, players, sponsors, registrations, auction state, payments, settings.
- Roles in models: `super_admin`, `event_organizer`, `team_admin`, `auctioneer`, `viewer`.
- Frontend effectively collapses **super_admin + event_organizer** into the same `/admin/*` surfaces via `ProtectedRoute` (`requireSuperAdmin` allows both).

### 1.4 Authentication & roles (as implemented)

| Role | How detected | Default landing |
|------|----------------|-----------------|
| Super admin | `userProfile.role === 'super_admin'` | `/admin` |
| Event organizer | `userProfile.role === 'event_organizer'` | `/admin` |
| Team admin | `userProfile.role === 'team_admin'` (+ `team_id`) | `/team` |
| Auctioneer / viewer | Present in backend enum | Not first-class in frontend routing |
| Player (registrant) | No login — public registration link | `/auctions/:eventId/register` |

### 1.5 CSS / design architecture today

| System | Location | Visual |
|--------|----------|--------|
| App global | `App.css`, `index.css`, Tailwind tokens | Purple gradient body, Exo 2 + Inter, `.glass` |
| shadcn tokens | `index.css` HSL variables | Light/dark generic, not brand-aligned |
| Marketing | `marketing/design.css` | Near-black + brand crimson, Outfit + Inter |

**Problem:** Product app still looks like 2024 “purple glass SaaS”; marketing looks like PowerAuction brand. Redesign must unify without touching business logic.

### 1.6 Critical file sizes (complexity hotspots)

| Page | ~Lines | Risk for pure UI swap |
|------|--------|------------------------|
| AuctionControl.jsx | 2386 | Highest — UI + polling + wheel + sell flow intertwined |
| PlayerRegistrationManagement.jsx | 1287 | High |
| PlayerManagement.jsx | 1034 | High |
| TeamManagement.jsx | 822 | Medium-high |
| PublicPlayerRegistration.jsx | 739 | High (payment return flow) |
| PublicTeamStats.jsx | 689 | Medium |
| UserManagement.jsx | 594 | Medium |
| EventManagement.jsx | 503 | Medium |
| TeamDashboard.jsx | 484 | Medium-high (live bid) |

---

## 2. Route inventory

### 2.1 PUBLIC — marketing

| Route | Page | Purpose | APIs | UI notes | Priority (later) |
|-------|------|---------|------|----------|------------------|
| `/` | HomePage (via LandingPage re-export) | Marketing homepage | None (contact form external) | Product mocks, FAQ, SEO | C (recently refined) |
| `/features` | FeaturesPage | Feature overview | None | Marketing shell | C |
| `/how-it-works` | HowItWorksPage | Workflow education | None | Marketing shell | C |
| `/player-registration` | PlayerRegistrationPage | Marketing: registration product story | None | Marketing | C |
| `/live-auction` | LiveAuctionPage | Marketing: live auction story | None | Marketing | C |
| `/team-management` | TeamManagementPage | Marketing: teams/purse | None | Marketing | C |
| `/auction-dashboard` | AuctionDashboardPage | Marketing: analytics/sponsors | None | Marketing | C |
| `/sports` | SportsPage | Multi-sport messaging | None | Marketing | C |
| `/pricing` | PricingPage | Pricing/demo CTA | None | Custom plans | C |
| `/contact`, `/demo` | ContactMarketingPage | Demo request | web3forms | Form | C |
| `/privacy-policy` | PrivacyPolicy | Legal | None | Marketing shell | D |
| `/terms-of-service` | TermsOfService | Legal | None | Marketing shell | D |
| `/contact-legacy` | ContactPage | Old contact UI | web3forms | Purple glass | D or remove later |

### 2.2 PUBLIC — operational (no auth)

| Route | Page | Purpose | Main functionality | API dependencies | Key UI |
|-------|------|---------|--------------------|------------------|--------|
| `/login` | LoginPage | Auth entry | Email/password, Google, forgot password modal | Firebase client; `POST /auth/forgot-password` | Form, modal |
| `/register` | RegisterPage | Organizer signup | Create account + terms | `POST /auth/register` | Form |
| `/reset-password` | ResetPasswordPage | Password reset | Token + new password | `POST /auth/reset-password` | Form |
| `/logout` | LogoutPage | Sign out | Firebase logout | Client | Transient |
| `/auctions/:eventId/register` | PublicPlayerRegistration | Player applies to league | Multi-field form, photo/docs, optional Cashfree pay, success | `GET /auctions/{id}`, `POST .../register-player`, `POST /payments/create-order`, `POST /payments/verify` | Long form, uploads, payment return |
| `/display/:eventId` | AuctionDisplay | Public/TV live display | Poll auction state, current player, team safe-bid summary | `GET /auction/state/{id}`, players, teams-safe-bid-summary | Full-screen display |
| `/public/team/:teamId/stats` | PublicTeamStats | Tokenized team owner public view | Team stats, players, auction state, safe bid | `GET /public/team/.../stats|players|auction-state`, max-safe-bid | Dashboard-like, no Navbar |
| `/promote-to-admin` | PromoteToAdmin | Bootstrap admin | Promote current user | `POST /auth/promote-to-admin` | Utility |
| `/test`, `/test-cloudinary` | Test pages | Dev diagnostics | Health/env | health, cloudinary | D — hide in prod |

### 2.3 ORGANIZER / SUPER ADMIN (shared `/admin` surface)

`ProtectedRoute requireSuperAdmin` allows **both** `super_admin` and `event_organizer`.

| Route | Page | User type | Purpose | Main functionality | APIs (primary) | Forms / tables / modals | Critical interactions |
|-------|------|-----------|---------|--------------------|----------------|---------------------------|------------------------|
| `/dashboard` | DashboardRedirect | Auth | Role router | Redirect to `/admin` or `/team` | none | Loading spinner | — |
| `/admin` | SuperAdminDashboard | Organizer / Super admin | Home hub | List auctions, user counts | `GET /auctions`, `GET /auth/users` | Cards, links | Navigate into event tools |
| `/admin/events` | EventManagement | Organizer | Auction CRUD | Create/edit events, rules, payment settings flags | `GET/POST/PUT /auctions` | Dialog form, list cards | Create auction |
| `/admin/categories/:eventId` | CategoryManagement | Organizer | Categories | CRUD categories, base price, min/max, color | categories endpoints | Dialog form, cards | Configure pool rules |
| `/admin/players/:eventId` | PlayerManagement | Organizer | Player pool | CRUD players, search/filter, release/make available, PDF | players, categories, teams | Dialog form, filters, cards/list | Bulk operational readiness |
| `/admin/priority-players/:eventId` | PriorityPlayers | Organizer | Wheel priority | Flag priority players for selection | players update | List toggles | Wheel input list |
| `/admin/sold-players/:eventId` | SoldPlayersManagement | Organizer | Post-sale | View sold, release | players, teams | List actions | Undo sale |
| `/admin/registrations/:eventId` | PlayerRegistrationManagement | Organizer | Review applicants | Approve/reject, payment status, convert to player | registrations approve/reject, list | Tables, filters, modals | Gate to auction pool |
| `/admin/teams/:eventId` | TeamManagement | Organizer | Franchises | CRUD teams, budget, admin assign, public link | teams, available-admins, generate-public-link | Dialogs, cards | Purse + owner setup |
| `/admin/sponsors/:eventId` | SponsorManagement | Organizer | Sponsors | CRUD sponsors, logos | sponsors | Dialogs, cards | Branding assets |
| `/admin/auction/:eventId` | AuctionControl | Operator / Organizer | **Live control room** | Start/pause, select player, wheel, timer, place/finalize bid, sell/unsold, safe bid views | auction/*, bids/*, players sell/unsold, teams safe bid | Huge composite UI, dialogs, spinner | **Mission-critical** |
| `/admin/analytics/:eventId` | Analytics | Organizer | Reports | Aggregates: sold, bids, spend, teams | `GET /analytics/event/{id}` | Stats cards, charts | Post-event insight |
| `/admin/events/:eventId/payments` | EventPayments | Organizer (any auth) | Payment ledger | List payments for event | `GET /auctions/{id}/payments` | Table | Finance reconciliation |
| `/admin/users` | UserManagement | Super admin oriented | Users | List/create/edit/delete users | auth/users* | Table, dialogs | Role ops |
| `/admin/settings` | Settings | Organizer | Bank details | Bank/UPI for offline or display | settings/bank-details | Form | Payout info |
| `/admin/payment-settings` | PaymentGatewaySettings | Super admin (nav gated) | Cashfree config | App ID, secret, mode | settings/payment-gateway | Form | Payment enablement |

### 2.4 TEAM OWNER

| Route | Page | Purpose | Functionality | APIs | UI |
|-------|------|---------|---------------|------|-----|
| `/team` | TeamDashboard | Authenticated team admin | Live state, current player, max safe bid, place bid, budget analysis | team, auction state, max-safe-bid, budget-analysis, bids/place | Cards, bid button, Navbar |
| `/public/team/:teamId/stats` | PublicTeamStats | Shareable secure link (no login) | Same domain of info; token in query | public team endpoints | Standalone |

### 2.5 PLAYER

| Route | Page | Notes |
|-------|------|--------|
| `/auctions/:eventId/register` | PublicPlayerRegistration | Only first-class player UX (no player account/dashboard) |

### 2.6 AUCTION OPERATOR

| Route | Page | Notes |
|-------|------|--------|
| `/admin/auction/:eventId` | AuctionControl | Primary operator surface (role filter in FloatingMenu mentions auctioneer but ProtectedRoute still uses organizer/super admin) |
| `/display/:eventId` | AuctionDisplay | Passive broadcast view |

### 2.7 OTHER / technical

| Route | Notes |
|-------|--------|
| `/promote-to-admin` | Bootstrap utility |
| `/test`, `/test-cloudinary` | Dev only |
| `PublicPlayerRegistration_backup.jsx` | Dead file (not routed) |

---

## 3. Functionality map (code-backed)

### 3.1 Player registration

```
Organizer configures event (payment_settings.collect_payment, fee, registration_limit)
        ↓
Public opens /auctions/:eventId/register
        ↓
GET /auctions/{eventId}  → form + branding + fee
        ↓
Player fills fields (name, contact, position, stats, photo, identity proof, …)
        ↓
If payment required:
  POST /payments/create-order → Cashfree checkout → return ?payment=success&order_id=
  POST /payments/verify → then POST /auctions/{id}/register-player
Else:
  POST /auctions/{id}/register-player
        ↓
Confirmation UI (SuccessAnimation path / submitted state)
        ↓
Organizer: /admin/registrations/:eventId
  GET /auctions/{id}/registrations
  POST /registrations/{id}/approve  → creates/links player
  POST /registrations/{id}/reject
```

**UI pain points (for redesign later):** long single form, payment return relies on `sessionStorage`, purple glass not brand-aligned, limited progress indication.

### 3.2 Auction setup

```
/admin/events
  POST/PUT /auctions  (name, date, rules, payment_settings, limits)
        ↓
/admin/categories/:eventId  → min/max players, base_price, color
        ↓
/admin/players/:eventId and/or registrations approve
  (+ bulk-upload API exists on backend)
        ↓
/admin/teams/:eventId  → budget, max_squad_size, logo, admin_email, public link
        ↓
/admin/sponsors/:eventId
        ↓
/admin/priority-players/:eventId (optional wheel input)
        ↓
/admin/auction/:eventId ready → POST /auction/start/{eventId}
```

**UI pain points:** setup is **page-per-entity** with FloatingMenu; no guided “auction readiness” checklist UI (though docs exist); inconsistent navigation depth.

### 3.3 Live auction

```
AuctionControl polls GET /auction/state/{eventId}
        ↓
Select next player:
  - Manual select, or
  - PlayerSpinner wheel (priority + available lists) → next-player / set current
        ↓
Player card + stats + base price
        ↓
Bidding:
  Teams bid via TeamDashboard / public stats + POST /bids/place
  Operator can finalize / complete transaction endpoints
        ↓
Sell: POST /players/{id}/sell  OR mark-unsold
        ↓
Team spent/remaining update (team model + budget-analysis)
        ↓
Next player…
```

**UI pain points:** 2.3k-line page; operator + TV concerns mixed; fullscreen mode exists but visual system is purple gradient; safe bid density high; spinner must not look “casino” after redesign.

### 3.4 Team owner

```
Path A — Login team_admin → /team
  GET team, auction state, current player, max-safe-bid, budget-analysis
  POST /bids/place

Path B — Shared link → /public/team/:teamId/stats?token=
  Public stats + players + auction-state + safe bid
```

**UI pain points:** two parallel UIs for similar jobs; public page includes debug panels in places; real-time via polling not websockets.

### 3.5 Analytics & finance

```
/admin/analytics/:eventId → GET /analytics/event/{id}
/admin/events/:eventId/payments → payment list
Settings: bank + (super admin) Cashfree credentials
```

---

## 4. Page quality audit

Scoring: **1 poor → 5 excellent** across hierarchy, IA, usability, consistency, spacing, type, color, responsive, a11y, loading/empty/error/success, tables/forms/modals, nav.

| Page | Score | Strengths | Weaknesses |
|------|-------|-----------|------------|
| Marketing homepage | **4** | Clear product story, brand system, FAQ/SEO | Heavy page; product mock ≠ live app UI |
| Marketing subpages | **3.5** | Consistent shell | Thin depth vs app reality |
| Login / Register | **3.5** | Marketing-aligned auth | Forgot password / reset slightly different eras |
| Privacy / Terms | **4** | Readable legal layout | Content still memorabilia-ish in places historically |
| SuperAdminDashboard | **2.5** | Simple overview | Sparse IA; purple glass; weak event-centric hierarchy |
| EventManagement | **3** | CRUD works | Forms dense; no wizard; glass cards |
| CategoryManagement | **3** | Clear entity model | Card grid not table; weak empty states |
| PlayerManagement | **2.5** | Feature-rich | Overloaded; search/filters cramped; modal form mega |
| PlayerRegistrationManagement | **2.5** | Critical workflow | Complex table; approve flows need clearer status UX |
| TeamManagement | **3** | Purse visible | Mixed card/dialog; public link UX buried |
| SponsorManagement | **3** | Standard CRUD | Low visual priority branding preview |
| AuctionControl | **2** | Full control exists | Cognitive load extreme; hierarchy weak; not “broadcast” quality |
| AuctionDisplay | **2.5** | Purpose-built | Needs display-first typography/scale |
| TeamDashboard | **2.5** | Bid + purse | Not calm/safe-bid clear enough; purple |
| PublicTeamStats | **2** | Shareable | Debug residue; inconsistent polish |
| PublicPlayerRegistration | **2.5** | Completes paid reg | Long form; progress; mobile friction |
| Analytics | **3** | Useful metrics | Charts/presentation generic |
| EventPayments | **3** | Table of payments | Basic |
| UserManagement | **3** | Admin table | Power-user only |
| Settings / Payment gateway | **3** | Forms work | Sensitive fields UX generic |
| FloatingMenu (global nav) | **2** | Discoverable on mobile | Rainbow FABs; not enterprise; role filters incomplete |
| Navbar | **2.5** | Logo + logout | Incomplete event context; no breadcrumbs |

**Cross-cutting scores**

| Dimension | Score | Notes |
|-----------|-------|--------|
| Visual consistency (app) | **2** | Purple gradient + glass everywhere; marketing is separate |
| Design system maturity (app) | **2** | shadcn primitives without product tokens |
| Responsive (app) | **2.5** | Some pages OK; AuctionControl / tables struggle |
| Accessibility | **2** | Color-only status, focus weak, contrast on glass |
| Loading / empty / error | **2.5** | Spinners exist; empty states ad hoc; errors via toast |
| Navigation IA | **2** | FAB menu + partial top nav; no sidebar/event shell |

---

## 5. Redesign priority

| Class | Meaning |
|-------|---------|
| **A** | Complete visual redesign (structure + components; logic stays) |
| **B** | Major UI refinement |
| **C** | Minor polish |
| **D** | Leave / deprioritize |

| Page / surface | Class | Why |
|----------------|-------|-----|
| **AuctionControl** | **A** | Signature product moment; highest UX debt; highest business impact |
| **AuctionDisplay** | **A** | Must feel broadcast-grade; different layout rules |
| **TeamDashboard** + **PublicTeamStats** | **A** | Differentiator; should feel one system, dual entry |
| **PublicPlayerRegistration** | **A** | First impression for players; conversion + payments |
| **PlayerRegistrationManagement** | **A** | Organizer ops bottleneck |
| **PlayerManagement** | **A** | Core prep surface; dense |
| **App shell (Navbar + FloatingMenu → new shell)** | **A** | Foundation for all app pages |
| SuperAdminDashboard | **B** | Becomes event command center |
| EventManagement | **B** | Setup entry; wizard optional later |
| TeamManagement | **B** | Purse economics must be obvious |
| CategoryManagement | **B** | Simpler but important |
| Analytics | **B** | Trust + post-event value |
| SponsorManagement | **B** | Brand moments in live UI |
| EventPayments / Settings / Payment gateway | **B** | Trust & money |
| UserManagement | **B** | Super-admin only |
| PriorityPlayers / SoldPlayers | **B** | Secondary but tied to live flow |
| Login / Register / Reset | **C** | Mostly aligned; unify residual |
| Marketing site | **C** | Already redesigned; keep aligned to app tokens |
| Legal pages | **D** | Content review only |
| Test / promote / backup files | **D** | Exclude from product UX |

---

## 6. Shared components & design system inventory

### 6.1 Existing reusable pieces

**App chrome**

- `Navbar` — sticky glass top bar
- `FloatingMenu` — event-scoped FAB nav
- `ProtectedRoute` — auth gate

**Domain widgets**

- `PlayerSpinner` — selection wheel
- `ImageUpload`, `ImageUploadWithCrop`, `ImageCropper`
- `DocumentUpload`
- `SuccessAnimation`

**Primitives (`components/ui`)**

Button, Input, Label, Textarea, Select, Checkbox, Dialog, Card, Badge, Table, Tabs, Progress, Toast/Sonner, Skeleton, etc.

**Marketing-only**

- `MarketingShell`, product mocks, design tokens in `marketing/design.css`

**Utils**

- PDF generator, Excel exporter, image URL helpers

### 6.2 Should become first-class design system components (proposed)

| Component | Used by |
|-----------|---------|
| `AppShell` (sidebar + topbar + content) | All organizer pages |
| `EventContextBar` (event name, status, quick links) | All `:eventId` routes |
| `PageHeader` (title, breadcrumbs, actions) | Most app pages |
| `StatCard` / `MetricStrip` | Dashboard, analytics, team |
| `DataTable` (search, filter, empty, pagination patterns) | Players, registrations, users, payments |
| `EntityFormDialog` patterns | CRUD modals |
| `StatusBadge` (auction, player, payment, registration) | Everywhere |
| `PlayerCard` (broadcast + compact variants) | Auction control, display, team |
| `TeamPurseCard` | Teams, live, owner |
| `BidPanel` / `SafeBidIndicator` | Team + control |
| `AuctionTimer` | Control + display |
| `PlayerSelectionWheel` (restyled PlayerSpinner) | Control |
| `AuctionStatusChip` | Control, display, team |
| `EmptyState`, `ErrorState`, `LoadingState` | Global |
| `PublicLayout` (registration, public team, display) | Special cases |
| Button / Input / Select tokens aligned to brand | Global |

**Do not invent new business components that imply new APIs.**

---

## 7. Proposed UX / information architecture

### 7.1 Organizer (event_organizer + super_admin shared shell)

```
[ Logo ]  Events ▾   [ Current Event: Name · LIVE ]          [User] [Logout]

Sidebar (when event selected):
  Overview
  Setup
    · Settings (event)
    · Categories
    · Sponsors
  Players
    · Pool
    · Registrations
    · Priority list
    · Sold / unsold
  Teams
  Live auction          ← emphasis when in_progress
  Analytics
  Payments
  ─────────
  All events
  Users (super_admin)
  Platform settings
  Payment gateway (super_admin)
```

**Mental model:** Events are the hub; most work is **inside an event**.

### 7.2 Auction operator

Same shell, but default landing = **Live auction** for in-progress events.  
Secondary: Display link (open `/display/:eventId` in new window), players, teams.

### 7.3 Team owner

```
Team home (authenticated /team)
  · Live bid panel
  · Purse / safe bid
  · Squad
  · Spending history

Optional: deep link to public stats for non-login devices
```

No full organizer sidebar.

### 7.4 Player

```
Registration only (public)
  Multi-step: Profile → Documents → Payment → Confirmation
No persistent player portal today — redesign must not invent account system unless product decides later.
```

### 7.5 Super admin

Organizer IA + global:

- All events (cross-organizer if applicable)
- Users
- Payment gateway
- Platform health (optional, non-API)

---

## 8. Special-case layouts (do not use normal dashboard chrome)

| Surface | Why special |
|---------|-------------|
| **Live Auction Control** | Dense, real-time, fullscreen; operator focus; avoid sidebar collisions; maximize player card + teams + controls |
| **Auction Display** | TV / projector; huge type; no nav chrome; dark stage aesthetic |
| **Public Player Registration** | Mobile-first funnel; trust + payment; no app nav |
| **Public Team Stats** | Shareable link; may be on phone in auction hall; minimal chrome |
| **Login / Register / Reset** | Auth funnel; marketing-aligned, no app shell |
| **Marketing pages** | Already separate shell — keep |
| **Auction results / analytics print** | Export-friendly; optional quiet layout |

---

## 9. Proposed design system

Align app with marketing brand (already partially defined in `marketing/design.css`) while restoring **electric blue + gold** accents as specified for product UI (marketing currently crimson-logo-led — **decide single brand primary** before Phase 1 implementation).

### 9.1 Recommended product tokens (proposal)

**Foundations**

- `--void` / background: `#070b14` – `#0a1020` (deep navy)
- Surface: `#111c32`, elevated `#182744`
- Border: `rgba(148,163,184,0.16)`

**Brand**

- Primary (action): Electric blue `#2563eb` / bright `#60a5fa` / deep `#1d4ed8`  
  *OR* keep logo crimson `#e11d2e` as primary if brand mandate — **pick one primary for CTAs**
- Accent (money / bid / premium): Gold `#e8b923` / soft `#f5d76e`
- Logo red: reserved for logo wordmark + critical “LIVE / SOLD” if blue is primary

**Semantic**

- Success `#22c55e`, warning `#f59e0b`, danger `#ef4444`, live pulse red/gold

**Typography**

- Display: Outfit or Exo 2 (pick one product-wide)
- Body: Inter
- Mono optional for bid amounts / timers
- Scale: 12 / 14 / 16 / 18 / 24 / 32 / 40 / 56

**Spacing**

- 4px base: 4, 8, 12, 16, 24, 32, 48, 64
- Page padding: 16–32; section gaps 24–40

**Radius**

- Control: 8; card: 12–16; pill: 999

**Shadows**

- Soft elevation; blue/gold glow sparingly on live elements only

**Breakpoints**

- 320 / 768 / 1024 / 1280 / 1440+

**Motion**

- 150–300ms ease; honor `prefers-reduced-motion`
- Live: subtle timer/bid pulse only

**Anti-patterns to ban in redesign**

- Full-page purple gradient as default app background  
- Rainbow FAB navigation  
- Casino gold overload on wheel  
- Glass-on-glass low contrast text  

### 9.2 Component specs (summary)

| Component | Spec notes |
|-----------|------------|
| Buttons | Primary blue/brand, secondary outline, ghost, danger, gold only for money CTAs |
| Forms | Labels always visible; helper + error text; 44px touch targets |
| Tables | Sticky header, zebra optional, row actions menu, mobile card-fallback |
| Cards | Border + subtle fill; no heavy blur |
| Badges | status-available / sold / unsold / pending / paid / live |
| Player card | Photo, name, role, category, 3–5 stats max, base + current bid |
| Bid panel | Current bid, next bid, purse, confirm step |
| Timer | Large digits, state colors |

---

## 10. Phased redesign roadmap

> Implementation constraint for all phases: **UI-only**. No API contract, schema, auth, payment, or auction rule changes. Prefer CSS tokens + layout components + presentational refactors; extract components carefully from large pages.

### Phase 1 — Design system foundation

| | |
|--|--|
| **Pages** | Global tokens, Story-less catalog optional |
| **Components** | Tokens, Button/Input/Badge/Card overrides, AppShell skeleton, StatusBadge, Empty/Loading/Error |
| **Risks** | Token collision with marketing; regression on every page using Tailwind arbitrary styles |
| **Dependencies** | Brand decision (blue vs crimson primary) |
| **Testing** | Visual regression on login + dashboard; contrast check |

### Phase 2 — Organizer dashboard & shell

| | |
|--|--|
| **Pages** | SuperAdminDashboard, Navbar→AppShell, replace FloatingMenu with sidebar |
| **Components** | AppShell, EventContextBar, PageHeader, EventCard |
| **Risks** | Organizers rely on FAB muscle memory |
| **Dependencies** | Phase 1 |
| **Testing** | Role routing super_admin vs event_organizer vs team_admin; deep links with `:eventId` |

### Phase 3 — Players & registration

| | |
|--|--|
| **Pages** | PublicPlayerRegistration, PlayerRegistrationManagement, PlayerManagement (start) |
| **Components** | Multi-step form layout, RegistrationStatusBadge, DataTable |
| **Risks** | Payment return + sessionStorage flow fragile — UI changes must not alter sequence |
| **Dependencies** | Phase 1–2 |
| **Testing** | Full paid + unpaid registration E2E; approve/reject; mobile form |

### Phase 4 — Teams & purse

| | |
|--|--|
| **Pages** | TeamManagement |
| **Components** | TeamPurseCard, OwnerAssignment UI polish |
| **Risks** | Public link generation UX accidental exposure |
| **Dependencies** | Phase 2 |
| **Testing** | Create team, budget display, assign admin, public link copy |

### Phase 5 — Auction setup (categories, sponsors, events, priority)

| | |
|--|--|
| **Pages** | EventManagement, CategoryManagement, SponsorManagement, PriorityPlayers, SoldPlayers |
| **Components** | Setup checklist (UI-only, computed from existing data if possible without new APIs) |
| **Risks** | Over-scoping checklist if data not available client-side |
| **Dependencies** | Phase 2–4 |
| **Testing** | CRUD each entity; event status display |

### Phase 6 — Live auction (control + display)

| | |
|--|--|
| **Pages** | AuctionControl, AuctionDisplay, PlayerSpinner restyle |
| **Components** | PlayerCard, BidActivity, AuctionTimer, TeamStrip, Wheel |
| **Risks** | **Highest** — performance, polling, fullscreen, intertwined state |
| **Dependencies** | Phase 1 tokens + careful presentational extraction |
| **Testing** | Start/pause, next player, wheel, sell, unsold, multi-team bid, display lag, reduced motion |

### Phase 7 — Team owner

| | |
|--|--|
| **Pages** | TeamDashboard, PublicTeamStats |
| **Components** | BidPanel, SafeBidIndicator, SquadList |
| **Risks** | Dual codepaths drift; remove debug UI carefully |
| **Dependencies** | Phase 6 components reusable |
| **Testing** | Bid placement, purse math display, token link access |

### Phase 8 — Analytics & payments UI

| | |
|--|--|
| **Pages** | Analytics, EventPayments, Settings, PaymentGatewaySettings |
| **Components** | Chart styling, finance tables (illustrative polish only) |
| **Risks** | Never invent metrics; only style existing payload |
| **Dependencies** | Phase 2 |
| **Testing** | Data matches API; empty event analytics |

### Phase 9 — Remaining pages

| | |
|--|--|
| **Pages** | UserManagement, PromoteToAdmin (minimal), auth residual, hide tests in prod |
| **Risks** | Low |
| **Testing** | User CRUD roles |

### Phase 10 — Responsive, accessibility, performance

| | |
|--|--|
| **Pages** | All redesigned surfaces |
| **Work** | Mobile nav, table→card, focus traps, contrast, image weight, code-split large pages if safe |
| **Risks** | AuctionControl bundle size |
| **Testing** | Lighthouse, keyboard paths, 320–1440 widths, screen reader smoke on forms |

---

## 11. Risks, constraints, and recommendations

### 11.1 Hard constraints (confirmed)

- Do not change Firestore schema, API contracts, auction math, Cashfree flow, Firebase auth.
- Do not break `gh-pages` deploy or Railway backend.
- `ProtectedRoute` currently equates organizer ≈ super admin for `/admin/*` — **do not “fix” authorization in redesign without product decision**.

### 11.2 Structural risks

1. **Monolithic pages** (especially AuctionControl) — redesign must be incremental presentational extraction.
2. **Dual design systems** (marketing vs app) — unify tokens first.
3. **FloatingMenu role filters** incomplete vs backend roles (`auctioneer`).
4. **TeamDashboard calls `GET /events`** while other pages use `/auctions` — redesign must not “fix” endpoints casually; note inconsistency for engineering backlog separate from UI.
5. **PublicTeamStats debug UI** — candidate for cleanup during Phase 7 UI only.
6. **No SSR for app** — marketing SEO already client-side; app is authenticated (SEO N/A).

### 11.3 Recommended design principles for implementation later

1. **Event-centric shell** for organizers.  
2. **Special layouts** for live, display, registration, public team.  
3. **One primary brand color** for CTAs; gold only for purse/bid.  
4. **Status language** standardized (registration, payment, player, auction).  
5. **Safe bidding clarity** over decorative animation.  
6. **Wheel = sports draft energy**, not casino.  
7. **Mobile-first** for registration and team owner; **desktop-first** for operator control.  

### 11.4 Success criteria (for later delivery)

- Organizer can complete setup without hunting FloatingMenu colors.  
- Operator can run live auction with clearer hierarchy than today.  
- Team owner understands purse + safe bid in &lt; 5 seconds.  
- Player completes registration on mobile without confusion.  
- Visual language matches PowerAuction marketing quality.  
- Zero intentional API/schema/auth/payment/auction logic changes.

---

## Appendix A — Backend API surface (reference for UI dependencies)

Auth: register, forgot/reset password, me, set-role, promote, users CRUD  
Auctions: CRUD list/get, registration count, register-player, registrations, bulk-upload  
Categories / Teams / Players / Sponsors CRUD-style endpoints  
Auction: start, pause, next-player, state, fix-current-players  
Bids: place, finalize, complete-transaction  
Player outcomes: sell, mark-unsold, make-available, release  
Budget: max-safe-bid, budget-analysis, teams-safe-bid-summary  
Public team: stats, players, auction-state, generate-public-link  
Payments: create-order, verify, event payments list  
Settings: bank-details, payment-gateway  
Analytics: event analytics  

*(Full list in `backend/server.py` — ~70 route handlers.)*

---

## Appendix B — Explicit non-goals for redesign implementation

- New player login portal  
- New websocket layer (unless separate project)  
- Changing safe-bid formulas  
- Changing Cashfree integration shape  
- Migrating off CRA/Firebase/Firestore for UI work  
- Rebuilding marketing from scratch again  

---

**Document end.**  
Ready to use as the blueprint for phased UI implementation when approved.
