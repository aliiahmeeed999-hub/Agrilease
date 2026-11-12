# agriLease — A Full-Stack Digital Platform for Agricultural Equipment Rental and Farm Management

**[University Name]**
**[Faculty / Department Name]**
**[Degree Programme]**

Submitted by: **[Your Full Name]** — **[Student ID]**
Supervisor: **[Supervisor Name]**
Academic Year: **[20XX / 20XX]**
Date: **[Submission Date]**

> This document is a factual engineering report generated from a direct audit of the project's source code, database schema, configuration, and test suite as of **2026-08-24** — the end-of-internship, feature-complete state of the system. It supersedes an earlier internal snapshot, `PROJECT_REPORT.md`, dated 2026-07-16, which is still committed in the repository and is referenced throughout this document by that date wherever a direct before/after comparison is useful. Every claim about what is implemented, partially implemented, or not implemented was verified against the actual codebase in this session — file reads, greps, computed line/file counts, a live test-suite run against two real database engines, and direct inspection of the authorization allow-lists — not assumed or carried forward from memory. Where this report's numbers differ from the 07-16 snapshot or from any other earlier account, the difference is stated explicitly rather than silently reconciled.
>
> Sections that a university template normally requires but that cannot be honestly generated from the codebase alone — a Literature Review with real scholarly citations, and the final academic Reference list — are left as clearly marked placeholders for the student to complete with their own course readings. Fabricating citations would be an academic-integrity risk, so none are invented here.
>
> **This report covers the system through its full internship arc**, in three build eras, each verified against the repository directly: (1) the foundation and core domain (marketplace + farm management), audited and reported as of 2026-07-16 in `PROJECT_REPORT.md`; (2) security/production hardening, live weather/soil/climate data integration, and trained machine-learning models, also completed and reported by 2026-07-16; and (3) — the subject of most of what is *new* in this document — a full four-role platform rebuild (equipment sales and financing alongside rental, a banker role, an expanded admin console), a navigation and design-system overhaul, complete English/French/Arabic internationalization, and two non-trivial production bugs found and fixed. Model training details, dataset provenance, and evaluation metrics for the AI/ML layer are unchanged since 07-16 and remain documented in full in `MODEL_CARD.md`, re-verified against current source in this pass (§8).

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Related Work](#3-related-work)
4. [Methodology](#4-methodology)
5. [System Design and Architecture](#5-system-design-and-architecture)
6. [Data Model](#6-data-model)
7. [Implementation](#7-implementation)
8. [Artificial Intelligence and Machine Learning Components](#8-artificial-intelligence-and-machine-learning-components)
9. [Security](#9-security)
10. [Testing and Evaluation](#10-testing-and-evaluation)
11. [Results](#11-results)
12. [Discussion](#12-discussion)
13. [Limitations and Future Work](#13-limitations-and-future-work)
14. [Conclusion](#14-conclusion)
15. [References](#15-references)
16. [Appendices](#16-appendices)

---

## 1. Abstract

agriLease is a full-stack web application for the Moroccan agricultural sector combining a **multi-sided equipment marketplace** — rental *and* outright sale, with an optional bank-financing workflow — and a **farm management system** (fields, crop cycles, workers, tasks, and a calendar), enriched with a real weather/soil/climate data layer and trained machine-learning models. In its final state, the platform serves **four** distinct user roles — Farmer, Rental Owner, Banker, and Administrator — each with a dedicated, permission-gated dashboard and navigation, evolved from an earlier three-role (Farmer / Equipment Owner / Admin) design.

The system is built on Next.js 16 (App Router) with React 19 and TypeScript, backed by a Prisma 7 ORM layer supporting both SQLite (local development, the default runtime datasource) and PostgreSQL (independently migrated, independently tested, selected via an environment variable — not the default, but fully validated in parallel). Authentication uses signed JWT session cookies with bcrypt-hashed passwords, immediate session revocation on account suspension, rate limiting, and server-enforced, two-layer role-based access control that has been architecturally hardened since the 07-16 snapshot to remove an entire class of allow-list drift risk (§5.3, §9).

The planning-assistance module is unchanged in mechanism since 07-16 and was re-verified line-by-line against current source in this pass: a gradient-boosted yield-prediction model trained on real FAOSTAT crop-yield and NASA POWER climate data; a decision-tree equipment-recommendation classifier trained on realistic synthetic data with the original rule-based logic retained as a confidence-gated fallback; a seasonal demand-forecasting signal; live weather (Open-Meteo), historical climate (NASA POWER), and soil (SoilGrids) integration; and a rule-based conversational assistant grounded in all of the above.

What is new relative to the 07-16 snapshot, and is the primary subject of this report: the platform grew from 3 roles to 4, from a rent-only marketplace to rent-*and*-sale with an owner/banker financing-approval pipeline, from a flat single-style top navigation to a role-aware collapsible sidebar with a three-tier visual elevation system and a unified loading/empty/error component, and from English-only to a fully parallel English/French/Arabic UI (including right-to-left layout) with 637 translation keys verified for exact key-parity across all three locales. The Prisma schema grew from 17 models/16 enums to **21 models/26 enums**, the automated test suite grew from 68 to **119 tests** (still passing on both SQLite and PostgreSQL, run live in this session, not estimated), and the codebase grew from roughly 319 TypeScript/TSX files (~15,776 LOC) to **412 files (21,037 LOC)**. Two non-trivial, previously-unreported production bugs were found and fixed in this final phase: a WebGL/canvas map-rendering containment defect that let map content bleed over page content during scroll, and an intermittent scroll-lock defect on first app load traced to an interaction between an experimental Next.js feature and an existing navigation pattern. Payment processing, email/SMS delivery, a production CI/CD pipeline, and a full LLM-based assistant remain explicitly out of scope at the end of the internship, exactly as scoped at the 07-16 checkpoint — none of these were silently added or silently dropped; each is confirmed absent from the current dependency tree and named plainly in §13.

---

## 2. Introduction

### 2.1 Background and Motivation

Small and medium-sized Moroccan farms frequently cannot justify the capital cost of owning specialized equipment (tractors, harvesters, sprayers, irrigation pumps) that is only needed for short, seasonal windows. Equipment owners, in turn, often have machinery sitting idle between jobs — and some owners would rather sell aging equipment outright than keep renting it out. A digital marketplace that matches idle or for-sale equipment with demand, and that can route a farmer who wants to buy but needs financing to a lender, addresses a real allocative-efficiency and access-to-capital problem in the sector. Separately, many small farms manage their fields, crop cycles, and labor with no digital system at all, and have no easy access to the kind of real weather/soil/yield data that could inform planting, irrigation, and equipment decisions.

agriLease was built to address these problems in a single platform: a farmer who is already tracking fields and crops in the same system that lets them rent or buy equipment is more likely to use both consistently; real external data (climate, soil) plus the platform's own usage data can directly improve the quality of both planning guidance and rental/purchase recommendations; and a farmer who cannot pay for equipment outright should be able to request financing without the rental-owner side of the marketplace needing to build or vet a lending product themselves — a dedicated Banker role absorbs that.

### 2.2 Problem Statement

The project set out to answer: *can a single, coherent web application provide (a) a trustworthy equipment marketplace supporting both rental and outright sale, with a real transaction lifecycle and conflict handling, (b) a financing pathway that lets a bank approve a purchase without ever exposing the transaction to the seller until approved, (c) genuine farm-management record-keeping, (d) real external agronomic data and genuinely trained planning-assistance models, and (e) a UI that is usable in a farmer's own language (French or Arabic, not just English) — while remaining honest about each model's real, measured accuracy, about the system's production-readiness, and about what was and wasn't completed by the internship's end?*

### 2.3 Objectives

1. Design and implement a relational data model covering users (across four roles), farms, fields, workers, tasks, equipment (rent and/or sale), bookings/transactions, financing requests, reviews, maintenance, crop cycles, notifications, and an administrative activity-audit trail.
2. Implement secure authentication and strict, server-verified, two-layer role-based access control, with immediate session revocation and rate limiting.
3. Build a real transaction lifecycle (rental request → approve/reject → completion → review; purchase offer → optional financing approval → seller approval → completion → bidirectional review) with correct handling of concurrent requests for the same equipment.
4. Build farm-management features (farms/fields CRUD, crop-cycle history, worker management, task management, an aggregating calendar) as first-class functionality.
5. Integrate real, live external agronomic data (current weather, historical climate, soil composition) with sensible caching and graceful degradation.
6. Train and honestly evaluate machine-learning models for yield prediction, equipment recommendation, and demand forecasting.
7. Extend the platform from three roles to four (adding Rental Owner distinctly from a generic Equipment Owner, and adding a Banker role), each with its own onboarding, profile schema, dashboard, and navigation, enforced server-side.
8. Redesign navigation and visual hierarchy as the role and feature count grew, replacing a flat top-bar and a single undifferentiated card style with a role-aware sidebar and a tiered design system.
9. Deliver full internationalization (English, French, Arabic) with verified key-parity and correct right-to-left rendering.
10. Diagnose and fix production-grade defects discovered during end-to-end verification, with a precise, mechanical root-cause account for each.
11. Identify, and honestly report, every remaining gap between this system's current state and a fully production-ready deployment.

### 2.4 Scope

**In scope, and delivered by the end of the internship:** the four-role marketplace-and-farm-management application described above, running against SQLite (default) or PostgreSQL (fully tested alternate), with real weather/soil/climate data integration, trained ML models for yield, equipment recommendation, and demand forecast, a 119-test automated suite run against both database engines, hardened authentication (session revocation, rate limiting, secret management), and complete English/French/Arabic internationalization.

**Scope items that moved from "excluded" to "delivered" during the internship** (i.e., were listed as future work or unaddressed at an earlier checkpoint and are now real, working features, verified in this pass):

- **Equipment sale, not just rental.** The 07-16 snapshot describes a rent-only marketplace. `Equipment.listingType` (`RENT` / `SALE` / `RENT_AND_SALE`), `Equipment.condition` (`NEW` / `USED`), and `Booking.type` (`RENT` / `SALE`) are now real, migrated, and exercised by the current test suite (`tests/equipment-listing.test.ts`, `tests/marketplace-listing.test.ts`).
- **A financing workflow.** Not present in any form at 07-16. `FinancingRequest` is a new model; a farmer can request financing on a purchase, a Banker can approve/reject it, and the equipment owner only sees the offer once financing is approved — verified end-to-end by `tests/financing.test.ts`.
- **A fourth role (Banker) and a real distinction between "Rental Owner" and the earlier generic "Equipment Owner."** Not present at 07-16.
- **Full internationalization.** Not present at 07-16 (no `next-intl`, no locale files existed in that snapshot's own tool inventory — confirmed absent by grep in this audit).

**Still explicitly out of scope, confirmed absent from the codebase in this pass** (each with what adopting it later would concretely require, unchanged in substance from the 07-16 assessment):

- **Payment processing/settlement.** No payment-gateway dependency exists in `package.json` (checked directly: no Stripe/similar). `Booking.totalPriceMad` and related price fields track price only — no money moves through the platform. Adopting this would require a payment provider account and API keys managed the same way `JWT_SECRET` is, a webhook endpoint reconciling async payment events, and a decision on how a financed purchase's disbursement is represented.
- **Email/SMS delivery.** Notifications remain in-app only (`Notification` table, bell dropdown). No `nodemailer`/SendGrid/Twilio dependency exists. Adopting this would require a transactional email/SMS provider, a template layer, and a per-channel opt-in preference on `User`.
- **A production deployment/CI pipeline.** No CI configuration file (`.yml`/`.yaml`) exists anywhere in the repository, confirmed by direct search in this audit. The 119-test suite is run manually, not automatically on every change.
- **A full LLM-based conversational assistant.** The chat assistant (§8.5) remains keyword/intent-classification based — confirmed unchanged in this pass by direct inspection of `src/lib/ai/assistant.ts`.

---

## 3. Related Work

*(This section is intentionally left as a guided outline rather than a filled-in literature review, unchanged in structure from the 07-16 snapshot — a trustworthy academic report needs real, checkable citations from the student's own course readings and library research, not invented ones. The categories below are unchanged in substance, with one addition reflecting what was actually built in the final phase.)*

### 3.1 Categories to research and cite

- **Peer-to-peer / sharing-economy equipment rental platforms** — two-sided marketplace literature (trust and reputation mechanisms, the specific mechanics of a bidirectional review system now implemented in `Review`, §6.2) applied to heavy equipment.
- **Farm management information systems (FMIS)** — digitizing field/crop record-keeping for smallholder agriculture, and documented barriers to smallholder adoption (connectivity, literacy, cost, and now — directly relevant to this final phase's i18n work — language) that motivate a mobile-friendly, low-complexity, multilingual UI.
- **Precision agriculture data sources** — Open-Meteo, NASA POWER, and SoilGrids remain the real, live, freely-licensed public APIs this project calls (§8.6), unchanged since 07-16.
- **Agricultural yield modeling** — unchanged; still directly relevant to the honestly-reported R² values in §8.2 and `MODEL_CARD.md`.
- **Reference evapotranspiration and irrigation scheduling** — FAO Irrigation and Drainage Paper 56 (Allen et al., 1998), unchanged, still the direct source for the irrigation estimate in §8.6.
- **Task scheduling / fleet-telematics systems** — unchanged; relevant to the hybrid rule-based/ML recommendation engine (§8.3).
- **Web application security baselines** — OWASP guidance on session management, password storage, and access control, unchanged, still directly relevant to §9.
- **New for this phase — access-control and information-architecture literature.** The final phase's two-layer RBAC refinement (collapsing a manually-synchronized allow-list pair into a single source of truth, §5.3) and the sidebar/design-tier redesign (§7.5) both connect to a body of software-engineering practice on reducing configuration duplication as a security and maintainability concern, and on information architecture for role-differentiated multi-tenant applications — worth citing general SE/HCI sources (e.g. Nielsen Norman Group's writing on progressive disclosure and role-based navigation) rather than treating this as a purely cosmetic change.

### 3.2 Positioning of this project

Unchanged from 07-16 in its core claim: agriLease's contribution is the **integration** of a rental-and-sale marketplace, financing pathway, farm management, real external agronomic data, and genuinely trained ML models in one data model and one UI, with a transparent, from-scratch implementation of the full stack. The final phase adds a genuine multi-sided-marketplace dimension (a third and fourth participant type — bank and, implicitly, the platform administrator as a moderator of a real financial workflow, not just a user-suspension tool) that pushes the system closer to a real two-sided-plus-lender marketplace architecture, which is worth explicitly framing against the sharing-economy/marketplace-trust literature in §3.1.

---

## 4. Methodology

### 4.1 Development approach

The system was built iteratively, in explicit, verified phases. Phases 1–9 below are unchanged from the 07-16 account (that report is the authoritative record of that period); phases 10–13 are new to this report and cover the final stretch of the internship.

1. **Foundation** — project scaffold, authentication, the User/Role model, route-level access control.
2. **Core domain** — Equipment, Booking, marketplace/rental flow, Farm/Field CRUD, dashboard.
3. **Schema completion** — Review, MaintenanceRecord, CropCycle, Notification built out end-to-end.
4. **Farm-management expansion** — Workers, Tasks, Calendar.
5. **Design and motion audit** — GSAP/Lenis usage audited against official guidance; marketing-only motion scope established.
6. **Security and production-readiness hardening** — JWT secret startup guard, immediate session revocation, rate limiting, an initial automated test suite, parallel PostgreSQL support.
7. **Real weather/soil/climate integration** — live Open-Meteo, NASA POWER, SoilGrids, FAO-56 irrigation estimate.
8. **Machine learning** — trained yield/recommendation/demand-forecast models, each parity-tested against their Python training output.
9. **Scope confirmation (mid-point)** — payment, email/SMS, and a full LLM assistant confirmed and documented as out of scope.
10. **Four-role platform rebuild.** The `Role` enum was widened from `FARMER | EQUIPMENT_OWNER | ADMIN` to `FARMER | RENTAL_OWNER | BANKER | ADMIN`, a schema and application-wide rename (not merely a relabeling — `RentalOwnerProfile` and `BankerProfile` are new, distinct 1:1 profile models, not reused columns on `User`), with role selection made explicit at signup, each role given its own onboarding branch, profile view, dashboard, and navigation, and every permission enforced server-side, not just hidden in the UI (§5.3, §9). A companion marketplace expansion added `Equipment.listingType`/`condition`/`salePrice` and `Booking.type`, and a new `FinancingRequest` model implementing a specific, load-bearing design decision: an owner's visibility into a financed purchase offer is a **read-time query filter** (the offer simply does not match the owner's query until the linked `FinancingRequest.status` is `APPROVED`), not a write-time status transition on the booking itself — chosen so the financing decision and the sale-approval decision cannot desynchronize into an inconsistent intermediate state.
11. **Navigation and design-system overhaul.** The original flat, single-row top navigation bar (all roles, all items, one horizontal list) was replaced with a role-aware, collapsible left sidebar (desktop rail + mobile off-canvas drawer, sharing one component so the two surfaces cannot silently drift apart), and a single flat card style was replaced with a three-tier visual elevation system (primary surfaces, secondary/metric cards, nested inline elements) applied consistently across the dashboard, equipment detail, tasks, and calendar screens. A single shared loading/empty/error-state component replaced several inconsistent one-off implementations found during this pass (§10.2).
12. **Internationalization.** `next-intl` was added; 637 translation keys were authored across English, French, and Arabic, verified for exact key-parity by an automated flatten-and-diff check (not spot-checked), including a manual right-to-left layout pass on every newly built surface (the sidebar correctly mirrors to the right under Arabic, using logical CSS properties rather than hardcoded left/right values).
13. **Production-bug verification pass.** The completed application was driven with a real headless browser (not only unit tests) to catch UI-level regressions unit tests cannot. This caught and led to fixing two real defects: a map-content scroll-bleed bug (§10.2) and an intermittent scroll-lock bug traceable to an experimental framework flag (§10.2) — both root-caused mechanically, not patched by trial and error.

### 4.2 Tools used

| Purpose | Tool |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI library | React 19 |
| Styling | Tailwind CSS 4 (custom 3-tier design-token theme, new this phase) |
| Component primitives | `@base-ui/react` (headless, accessible primitives) |
| ORM / database | Prisma 7; SQLite (`@prisma/adapter-better-sqlite3`, default runtime) and PostgreSQL (`@prisma/adapter-pg`, fully tested alternate) in parallel |
| Server state / data fetching | TanStack Query 5 |
| Forms & validation | React Hook Form + Zod |
| Authentication | `jose` (JWT signing/verification), `bcryptjs` (password hashing) |
| Internationalization | `next-intl` (English, French, Arabic; RTL support) — **new this phase** |
| Maps | Leaflet / React-Leaflet |
| Charts | Recharts |
| Animation | GSAP 3 (+ `@gsap/react`, ScrollTrigger, SplitText, Flip), Lenis (smooth scroll, marketing pages only) |
| Automated testing | Vitest (119 tests, run against both SQLite and PostgreSQL, confirmed live in this session, §10) |
| ML training (offline, not a production dependency) | Python 3.12, scikit-learn, pandas, numpy, Faker — unchanged since 07-16 |
| External data APIs | Open-Meteo, NASA POWER, SoilGrids, FAOSTAT |
| Manual/scripted verification | A real headless-Chromium (Playwright) driver script, run ad hoc for UI verification — **not** a committed part of the automated test suite (no Playwright dependency, config, or spec files exist in the repository; this distinction is made explicitly because it would be easy to overstate) |

### 4.3 Verification philosophy

Unchanged in principle from 07-16, and re-applied to every change in this final phase: a feature is not "done" once it compiles. Each pass in this phase was closed out against a clean `tsc --noEmit`, a clean `eslint`, and a full Vitest run against both database engines — verified live in this audit, not carried forward from an earlier claim (§10, §11.1). Two additions to this discipline in the final phase specifically: (1) every new schema change was mirrored into *both* the SQLite and PostgreSQL migration histories in the same working session, with a scripted verification pass connecting to each database directly to confirm the migration actually applied as intended, not merely that the migration file was generated; (2) the completed UI was driven with a real browser end-to-end (not only through API-level tests) specifically to catch the class of bug that a passing test suite cannot — visual/layout regressions and browser-API interaction bugs — which is exactly how the two defects in §10.2 were found.

---

## 5. System Design and Architecture

### 5.1 High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                                │
│   React 19 client components + TanStack Query cache              │
│   next-intl locale context (en / fr / ar, RTL-aware)              │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTPS (dev: HTTP) fetch
┌───────────────────────────────▼───────────────────────────────────┐
│                    Next.js 16 (App Router)                        │
│  ┌───────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │ (marketing)   │  │ (auth)             │  │ (app)             │ │
│  │ public landing│  │ login / register  │  │ 4-role screens    │ │
│  └───────────────┘  └────────────────────┘  └───────────────────┘ │
│  src/proxy.ts — single catch-all matcher (all non-static paths +  │
│    all /api/*) — rate limiting, JWT verify, suspension check,     │
│    ROUTE_ROLE_MAP gate, in that order (§5.3 — architecture change)│
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  /api/* route handlers (62 files) — requireCurrentUser() + │   │
│  │  requireRole() re-checked per request, Zod-validated input │   │
│  └────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  src/lib/ai/* — trained-model inference (GBM/tree engines) │   │
│  │  src/lib/{weather,soil,nasaPower,irrigation}.ts — live APIs │   │
│  │  src/components/map/MapView.tsx — shared, containment-safe │   │
│  │    Leaflet wrapper (§10.2)                                  │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ Prisma Client (dual adapter, §9.5)
┌───────────────────────────────▼───────────────────────────────────┐
│         SQLite (dev.db, default) or PostgreSQL (DATABASE_PROVIDER) │
│       21 models / 26 enums — see §6 for the full data model        │
└─────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ offline, one-time training (unchanged since 07-16)
                    ┌────────────┴────────────┐
                    │  scripts/ml/*.py         │
                    │  FAOSTAT · NASA POWER ·  │
                    │  synthetic generators    │
                    │  → src/lib/ai/*.json     │
                    └──────────────────────────┘
```

### 5.2 Route groups

Unchanged in structure from 07-16: `(marketing)`, `(auth)`, `(app)`. What changed inside `(app)`: it now serves four distinct navigation sets (one per role) through a single shared `AppChrome` component (desktop sidebar + mobile drawer + top bar), rather than one shared top-navigation list filtered by role.

### 5.3 Defense-in-depth access control — architecture change since 07-16

Access control is still checked in multiple, independent layers, but the specific mechanism changed in a way worth documenting precisely, because it removes a defect class the 07-16 report flagged as a real, previously-encountered bug source:

1. **Rate limiting** (`src/lib/rate-limit.ts`, applied in `src/proxy.ts` to every `/api/*` request) — unchanged: an in-memory fixed-window limiter, 10 req/min/IP on `/api/auth/login` and `/api/auth/register` combined, 240 req/min/IP on everything else, real `429` responses with `Retry-After`. Documented limitation, unchanged: in-memory state does not coordinate across multiple server instances.
2. **Proxy layer** (`src/proxy.ts`) — **the matcher itself changed.** At 07-16, the proxy's `config.matcher` was an enumerated array that had to be kept in sync by hand with `ROUTE_ROLE_MAP`, and that exact desynchronization had already caused two real bugs. As of this audit, `config.matcher` is a single, broad catch-all pattern — `"/api/:path*"` plus `"/((?!_next|_vercel|.*\\..*).*)"` (every non-static, non-Next-internal path) — verified directly in this session by reading the file. This means every request that could possibly need a role check reaches the proxy's logic unconditionally; `ROUTE_ROLE_MAP` alone now determines which specific prefixes are actually gated. There is no longer a second list that can drift out of sync with the first, because there is no longer a second enumerated list — the earlier failure mode is not "fixed by remembering to update both lists," it is structurally no longer possible. This was independently re-verified in this audit by re-reading both `src/proxy.ts` and `src/lib/constants.ts`'s `ROUTE_ROLE_MAP` side by side; no drift exists, and none is currently possible in this design.
3. **Suspension check** — unchanged in mechanism: `isUserSuspended()` re-queries the database on every gated navigation and every authenticated API call, not just at login.
4. **API layer** — unchanged: every route handler independently calls `requireCurrentUser()` and, where relevant, `requireRole(user, [...])`.

### 5.4 Frontend structure (feature-sliced)

Unchanged in shape from 07-16 (`app/`, `features/<domain>/{components,hooks}`, `services/`, `types/`, `components/`, `lib/`, `hooks/`), with two new top-level additions confirmed in this pass: `src/components/layout/{Sidebar,AppChrome}.tsx` (the navigation redesign, §7.5) and `src/components/states/{CardState,RetryAllBanner}.tsx` (the unified loading/empty/error system, §7.5). `src/features/` now has domain folders for `banker` and `financing` in addition to every domain present at 07-16.

---

## 6. Data Model

The Prisma schema (`prisma/schema.prisma`) defines **21 models** and **26 enums**, up from 17 models / 16 enums at the 07-16 checkpoint — verified in this session by direct grep count against the live schema file, not carried forward. It remains provider-agnostic Prisma syntax authored once in SQLite dialect; `scripts/generate-postgres-schema.mjs` mechanically derives the PostgreSQL variant so the two can never silently diverge.

### 6.1 Entity summary — models new since the 07-16 snapshot

| Model | Purpose |
|---|---|
| `RentalOwnerProfile` | 1:1 extension of `User` for the Rental Owner role — individual/company account type, company registration fields, IBAN (finance/admin-visible only) |
| `BankerProfile` | 1:1 extension of `User` for the Banker role — institution name, regions covered, default interest-rate/terms text |
| `FinancingRequest` | Links a `Booking` (type `SALE`) to a requested loan amount and a Banker's decision (`SUBMITTED` / `UNDER_REVIEW` / `APPROVED` / `REJECTED`); drives the read-time visibility filter described in §4.1 |
| `ActivityLog` | Append-only audit trail of every administrative moderation action (role change, verification, suspension, listing flag/removal), with actor, target, and structured metadata — did not exist at 07-16, when the admin console was analytics/suspend/flag only |

### 6.2 Entity summary — unchanged since 07-16 (carried forward, re-confirmed present)

`User`, `Farm`, `Field`, `Worker`, `Equipment`, `Task`, `EquipmentAlert`, `EquipmentTrackPoint`, `EquipmentPerformanceSample`, `Booking`, `Review`, `MaintenanceRecord`, `CropCycle`, `Notification`, `Crop`, `WeatherCache`, `SoilCache` — all 17 models named in the 07-16 report's Appendix A are still present, confirmed by direct schema read in this session.

### 6.3 Notable relational design decisions — new this phase

- **`Equipment` gained `listingType`, `condition`, `salePrice`, `negotiable`, and condition-specific fields** (`yearOfManufacture`, `hoursUsed`, `conditionNotes`, `warrantyMonths`, `dealerCertified`) rather than a parallel "for-sale equipment" model — the same equipment row can be listed for rent, for sale, or both, avoiding data duplication between two listing types for what is physically one machine.
- **`Booking.type` (`RENT` | `SALE`) unifies the rental and purchase transaction lifecycle in one model** rather than a separate `Purchase` table, so a single farmer-facing "My Transactions" view and a single owner-facing approval queue can serve both transaction types with one query shape, filtered by type. This required widening several previously-required `Booking` fields (`startDate`, `endDate`, `dailyRateMad`) to nullable, since a `SALE` booking has no rental date range — a deliberate, audited widening, following the same "check every existing consumer before loosening a constraint" discipline the 07-16 report documents for the `Task.equipmentId` change.
- **`Review.authorId` was added and its unique constraint widened from `[bookingId]` to `[bookingId, authorId]`**, enabling the bidirectional review capability described in §7.3 — at 07-16, only the renter could review a completed booking; a rental owner or equipment seller could not review the other party. This is a genuine schema-level capability addition, not a UI-only change.
- **Financing visibility is deliberately not modeled as a `Booking` status value.** A financed `SALE` booking's owner-visibility is computed at read time (a Prisma `OR` filter joining the linked `FinancingRequest.status`), not written as a `Booking.status` transition when financing is approved — chosen specifically so the financing-approval and sale-approval decisions cannot desynchronize into an invalid intermediate state (e.g. a booking marked "approved for sale" that a bank has not actually financed).

---

## 7. Implementation

### 7.1 Authentication and session management

Unchanged in every mechanical detail from 07-16, re-verified directly in this session by reading `src/lib/auth/jwt.ts` and `src/lib/auth/suspension.ts` in full:

- Passwords hashed with `bcryptjs`; plaintext never persisted.
- JWT (HS256, `jose`), `sub`/`email`/`role`/`fullName` payload, 7-day expiry, HTTP-only cookie.
- `JWT_SECRET` startup guard: the application refuses to boot outside `NODE_ENV=development` if the secret is missing or still equals the literal string `"dev-only-agrilease-jwt-secret-change-in-production"` — the exact placeholder value is hardcoded in the guard itself, so a deployment cannot silently inherit a `.env.example`-copied default.
- Suspension is re-checked per request via `isUserSuspended()`, both in `requireCurrentUser()` (every API call) and directly in `src/proxy.ts` (every gated navigation) — a session issued before a suspension is rejected on the very next request.

### 7.2 Role-based feature set (four roles, current state)

**Farmer** — dashboard (stat tiles, interactive field map, workload chart, equipment readiness, live weather card), Farms/Fields CRUD with live weather and soil cards per farm, crop-cycle history with an irrigation-recommendation panel, Workers CRUD, Tasks CRUD, an aggregating Calendar, Marketplace browsing (now with rent/sale/condition/category filters and sort — new this phase), a unified **My Transactions** view covering both rentals and purchases with an in-page toggle (replacing two separate nav items, §7.5), a **Financing** view showing the status of any financing requests submitted, the AI module (yield/recommendation/forecast/chat), and notifications.

**Rental Owner** *(renamed and re-scoped from the 07-16 report's "Equipment Owner")* — owner dashboard, fleet listing management with rent/sale/both listing types and condition detail, a Rental Requests queue (unchanged approve/reject mechanism), a **Sale Offers** queue (new — read-time-filtered per §6.3), an owner-scoped Calendar (new), and maintenance logging.

**Banker** *(new role, did not exist at 07-16)* — a dashboard summarizing pending/approved/rejected financing requests and total amount financed, a Financing Requests queue with approve/reject/request-more-info actions, and an Approved Loans history view.

**Administrator** — platform analytics summary (unchanged), user management (now including role changes and a real verification-status field, not only suspend/reactivate), listings moderation (flag/unflag, unchanged mechanism), a read-only **Transactions** ledger (new), and a full **Activity Log** (new — every moderating action is now attributed and auditable, backed by the new `ActivityLog` model, §6.1).

**Onboarding** — extended from two role branches to four; a Banker's onboarding collects institution name and regions covered into the new `BankerProfile`.

### 7.3 The transaction lifecycle and its concurrency handling

The rental lifecycle is unchanged from 07-16 in mechanism (atomic conditional `updateMany` inside a Prisma transaction closes the same read-then-write race window described in that report). What is new: a `SALE`-type booking follows a parallel lifecycle — offer submitted (optionally with `financingRequested: true`) → if financed, invisible to the owner until a Banker approves it (§6.3) → owner approves/rejects → on approval, every other pending `SALE` offer on the *same equipment* is auto-rejected in the same transaction, using the identical atomic-update idiom as the rental auto-reject, but deliberately *not* checking for date overlap (a sale has no date range; one unit simply cannot sell twice) — and deliberately *not* touching any pending `RENT` booking on the same equipment, since the two transaction types are independent. A Banker rejecting a `FinancingRequest` cascades, in the same transaction, to reject the linked `Booking` — verified directly by `tests/financing.test.ts`, including a specific test asserting that approving one `SALE` offer leaves unrelated `RENT` bookings on the same equipment untouched (i.e. the two flows are correctly siloed, not merely usually siloed).

Reviews were widened to be **bidirectional**: `Review.authorId` plus a `[bookingId, authorId]` unique constraint (§6.3) lets either the renter/buyer or the equipment owner/seller leave one review each for the same completed transaction — at 07-16, only the renter could review. `isBookingReviewEligible()` was extended with a `SALE`-specific branch: a sale has no end date to wait for, so it becomes reviewable immediately on approval, whereas a rental remains gated on its end date having passed, unchanged from 07-16.

### 7.4 Notifications

Unchanged in mechanism from 07-16 (lazy reconciliation on read, event-driven creation for synchronous actions).

### 7.5 Navigation, motion, and the design system — new this phase

The 07-16 report's §7.5 describes a single-purpose Lenis/GSAP scope boundary between the marketing site and authenticated screens; that boundary is unchanged and was re-confirmed in this audit (`SmoothScrollProvider` is still mounted only in the `(marketing)` layout). What is new is a full navigation and visual-hierarchy redesign of the authenticated application itself:

- **Sidebar navigation.** The single flat top-navigation bar (all roles' items in one horizontal row) was replaced with a role-aware left sidebar — grouped sections for roles with enough items to warrant grouping (Farmer, Rental Owner), a flat list for roles with fewer items (Banker, Admin), a collapsible icon-only rail with a persisted per-user preference, and an off-canvas drawer on mobile that shares its section-rendering component with the desktop rail so the two surfaces cannot structurally diverge.
- **A three-tier visual elevation system**, applied via a small shared class-name utility rather than a change to the base `Card` primitive (to avoid unintended visual changes on pages outside this redesign's scope): Tier 1 for a page's primary content (the field map, an equipment detail page's main cards, the calendar), Tier 2 for secondary/metric cards (dashboard stat tiles, task cards, alerts/performance cards), Tier 3 for small nested elements inside a Tier 1/2 card (a stat pill, a list row).
- **A unified `CardState` component** for loading/empty/error rendering, replacing several inconsistent one-off implementations found during this pass — including one card (a farm's weather widget) that had no visible retry action on error at all, and another (maintenance history) using a bare, unstyled error message. A companion `RetryAllBanner` appears only when two or more independent widgets on the same page are simultaneously in an error state, offering one "retry all" action without hiding each widget's own specific error.
- **My Transactions.** "My Rentals" and "My Purchases" were merged from two separate navigation items and routes into one page with an in-page Rentals/Purchases toggle, reusing the same status-filter-pill component that already existed for the rental list.

### 7.6 Internationalization — new this phase

`next-intl` drives three locales (English, French, Arabic). 637 translation keys are maintained with automated key-parity verification — a script flattens each locale's JSON to a dotted-key list and diffs the three sets, run in this audit and confirmed to show zero missing keys in any of the three locales. Arabic is right-to-left; the sidebar and every other newly built surface in this phase were built with Tailwind's logical CSS properties (`ps-`/`pe-`, `border-s`/`border-e`, `text-start`/`text-end`) rather than hardcoded `left`/`right`, verified in this audit by directly checking rendered HTML output under the `ar` locale, which confirmed the sidebar's border class resolves to a logical (mirroring) property, not a fixed side.

---

## 8. Artificial Intelligence and Machine Learning Components

**This entire section is unchanged in mechanism from the 07-16 report and `MODEL_CARD.md`.** No retraining, no new features, and no changes to the served inference logic occurred in the final phase. This was not assumed — every claim below was re-verified against the *current* source files in this session (not against the 07-16 document's description), specifically because the internship prompt for this report asked for that re-verification in case anything had silently drifted. It had not.

### 8.1 Yield prediction (`src/lib/ai/yield.ts`)

Re-read in full in this session. Confirmed unchanged: one gradient-boosted regression tree ensemble per crop type, trained offline on 1,892 real FAOSTAT yield rows joined with real NASA POWER historical climate, served via a hand-written TypeScript tree-traversal engine (`src/lib/ai/gbm.ts`) fed each field's own trailing-365-day real climate at request time. `OTHER` crop type and any live-climate-fetch failure both fall back to the original hash-based heuristic; every prediction carries a `modelBacked: boolean`. Measured accuracy (held-out 20% split, per `MODEL_CARD.md` §1.3, not re-run in this pass since no retraining occurred): R² from 0.332 (olives) to 0.663 (wheat).

### 8.2 Equipment recommendation (`src/lib/ai/recommendations.ts`)

Re-read in full in this session. Confirmed unchanged: `CLASSIFIER_CONFIDENCE_THRESHOLD = 0.5` is still the literal fallback threshold in the current source; a single decision tree (64.4% held-out accuracy per `MODEL_CARD.md` §2.3) is tried first and falls back to the original keyword-matching rule when confidence is below threshold or required inputs are missing; the UI text `"(trained model, NN% confidence)"` is still present, confirmed by grep against current source.

### 8.3 Demand forecasting (`src/lib/ai/forecast.ts`)

Re-checked in this session (targeted grep against current source, not a full re-read): `platformSeasonalTrendFor()` and the `±2-week-smoothed seasonal average` comment describing the moving-average smoothing fix are both present in current source, matching `MODEL_CARD.md` §3's account exactly.

### 8.4 Chat assistant (`src/lib/ai/assistant.ts`)

Re-read in full in this session. Confirmed unchanged: intent classification is still keyword/regex based (`Intent = "YIELD" | "RECOMMENDATION" | "FORECAST" | "WEATHER" | "SOIL" | "GREETING" | "FALLBACK"`), no LLM or external AI API call exists anywhere in this file or its imports.

### 8.5 Real weather, climate, and soil integration (`src/lib/weather.ts`, `soil.ts`, `nasaPower.ts`, `irrigation.ts`)

Re-read `weather.ts` and `soil.ts` in full in this session; both match `MODEL_CARD.md`/the 07-16 report's description exactly: Open-Meteo current conditions cached 1 hour with stale-fallback on fetch failure; SoilGrids pH/nitrogen/organic-matter (Van Bemmelen conversion) cached 30 days, phosphorus/potassium/soil-moisture deliberately left `null` rather than substituting a mislabeled proxy.

---

## 9. Security

### 9.1 What is implemented (current state, re-verified)

Every item below was re-confirmed by direct source inspection in this session, not carried forward from the 07-16 report:

- Password hashing via bcrypt.
- Signed, expiring JWT session cookies with a startup guard against a missing/placeholder secret (§7.1) — quoted directly from current source: *"JWT_SECRET is missing or still set to the development placeholder value. Set a unique secret (see .env.example) before running outside NODE_ENV=development."*
- Immediate session revocation on suspension, checked per-request (§7.1).
- Rate limiting on all API routes via an in-memory fixed-window limiter (`src/lib/rate-limit.ts`), re-read in full in this session — unchanged mechanism from 07-16.
- Two-layer role-based access control, now covering **four** roles, with the proxy-layer allow-list mechanism architecturally hardened since 07-16 (§5.3).
- `.env.example` present, `.env` git-ignored with the tracked-exception carve-out confirmed present in `.gitignore` (`.env*` then `!.env.example`).
- An automated test suite (119 tests, §10) covering auth, the rental *and* sale/financing transaction lifecycle, and every AI/external-data function, run against both database engines live in this session.

### 9.2 Re-verified: no new gaps introduced by the four-role/marketplace/financing expansion

Adding two new roles, a new transaction type, and a new financing model is exactly the kind of change that could plausibly reopen an access-control gap if a new route were added to the application without also being added to `ROUTE_ROLE_MAP`. This was checked directly in this audit: every current API route under `src/app/api/banker/*`, `src/app/api/owner/sale-offers/*`, `src/app/api/financing-requests/*`, and `src/app/api/admin/{transactions,activity-log}/*` (all new since 07-16) independently calls `requireRole()` with an explicit, correctly-scoped role list, confirmed by direct inspection alongside the `ROUTE_ROLE_MAP` entries added for the corresponding page routes (`/banker`, `/transactions`, `/financing`, `/admin`). No route was found that is reachable without a role check.

### 9.3 Remaining, honestly-reported gaps (unchanged from 07-16)

- Rate limiting remains in-memory and single-instance — a horizontally-scaled deployment would need a shared store (e.g. Redis).
- No production deployment/CI pipeline (confirmed absent in this audit, §2.4).
- NASA POWER historical-climate calls are still not cached in a dedicated time-series table (unchanged since 07-16).

### 9.4 PostgreSQL support — current state, precisely stated

**This must be stated precisely, because "PostgreSQL migration" can be read two different ways and only one is true here.** `schema.prisma`'s `datasource db` block literally reads `provider = "sqlite"`, and the project's `.env` sets `DATABASE_PROVIDER="sqlite"` — **SQLite remains the default runtime datasource**, unchanged from 07-16. What is true, and was re-verified live in this session, is that a fully independent, fully migrated, fully tested PostgreSQL schema mirror exists (`prisma/schema.postgres.prisma`, `prisma/migrations-postgres/`) and that the **entire 119-test suite was run against a live PostgreSQL 16 container in this session and passed in full** (§10, §11.1) — a genuine, current, re-confirmed regression pass, not a claim carried forward from an earlier report. The correct summary is: *PostgreSQL is validated and production-viable as an alternate datasource, selectable via one environment variable, but the application has not been switched over to run on it by default.*

The PostgreSQL migration history itself is intentionally shorter than SQLite's (4 migrations vs. 9): PostgreSQL tracking began on 2026-07-16 with one consolidated `init` migration reflecting the schema as it stood at that date, rather than replaying SQLite's full incremental history from the project's start — a deliberate, reasonable choice when standing up a second environment mid-project, not drift or an oversight. Every schema change made *after* 2026-07-16 (weather-forecast fields, preferred-language, and the four-role/marketplace/financing expansion) has a matching migration in both histories, applied within roughly two minutes of each other by migration timestamp — confirmed by directly listing both migration directories in this audit.

---

## 10. Testing and Evaluation

### 10.1 Automated test suite — current state, run live in this session

**119 tests across 14 files**, confirmed by a live run in this session against both database engines (not estimated, not carried forward): `npx vitest run` (SQLite) → `Test Files 14 passed (14)`, `Tests 119 passed (119)`; `npx vitest run --config vitest.postgres.config.ts` (PostgreSQL, container started fresh for this audit) → identical result, `14 passed (14)` / `119 passed (119)`. This is up from 68 tests across 8 files at 07-16 — the 6 new files are `admin-roles.test.ts`, `financing.test.ts`, and four others covering the marketplace/equipment-listing/roles/i18n surface added in the final phase, confirmed by directly listing `tests/*.test.ts` in this session.

Coverage beyond what the 07-16 report describes: the full four-role permission boundary (explicit tests asserting a Farmer cannot reach a Banker-only endpoint and vice versa), the complete financing visibility/approval/rejection lifecycle including the read-time-filter design (§6.3) and the same-equipment-only auto-reject siloing (§7.3), marketplace category/condition/listing-type filtering and sorting correctness, and admin activity-log attribution (every mutating admin action produces exactly one correctly-attributed log row).

**No Playwright specs are part of this committed suite** — worth stating plainly since the tools table in §4.2 lists Playwright as used for manual verification, and it would be easy to conflate the two. `package.json` has no Playwright dependency, and no `.spec.ts`/`playwright.config.*` file exists anywhere in the repository, confirmed by direct search in this audit.

### 10.2 Real bugs found and fixed this phase (new since 07-16)

Two production-grade defects were found by driving the finished application with a real browser, not by the automated test suite (which, by construction, does not render a page in a real browser or scroll it) — each is described here with the same mechanical precision the 07-16 report's §10.2–10.4 established as this project's standard.

**A map-content scroll-bleed defect.** A Leaflet map embedded in a card would, on some scroll interactions, visibly render its tile/polygon content over the page content below it. Root cause, confirmed by direct inspection of the pre-fix component: the map's wrapper `<div>` lacked `overflow: hidden` and any CSS stacking-context containment (`isolation`/`contain`), and Leaflet's canvas — once promoted to its own GPU compositing layer by the browser, a normal outcome for a WebGL/canvas-heavy element — could then paint above later sibling cards during a scroll repaint if its parent did not establish a proper containing context. A second contributing factor: Leaflet caches its container's pixel dimensions at mount and never re-measures on its own, so a container that resized after the surrounding flex/grid layout settled could leave the canvas painting beyond its now-stale cached bounds. Fix: a single shared `MapView` component (`src/components/map/MapView.tsx`) now wraps every Leaflet instance in the app with explicit `overflow-hidden`, `isolate`, and `contain: layout paint`, and mounts a `ResizeObserver` that calls Leaflet's `map.invalidateSize()` whenever the wrapper's measured size changes, plus a window-resize listener for the same purpose — centralized once so every current and future map instance inherits the fix rather than needing it patched per page.

**An intermittent first-load scroll-lock defect.** Reported symptom: occasionally, right after entering the application (never after, and only fixed by a hard refresh), the page could not be scrolled with a trackpad. Investigation systematically ruled out the usual suspects for this class of bug — no `body-scroll-lock`-style library is a dependency, no code anywhere sets `document.body.style.overflow`, the one modal-like mobile drawer in the app does not lock body scroll and only opens on an explicit click (not on load), and the smooth-scroll library (Lenis) is mounted only on marketing pages, not the authenticated app, and — in its configured mode (`autoToggle` not set) — never touches the DOM's `overflow` style at all, confirmed by reading Lenis's own source in `node_modules`. The actual root cause: `next.config.ts` had Next.js's **experimental `viewTransition` flag** enabled, which wraps every client-side navigation in the browser's native View Transitions API; that API's transition overlay can be left stuck in place (silently intercepting scroll input while visually indistinguishable from the real page) if the transition's completion promise is interrupted before it resolves. The login flow's own code (`LoginForm.tsx`) calls `router.push(destination)` immediately followed, with no sequencing, by `router.refresh()` — and the destination route's layout performs a genuinely variable-latency database round-trip (the session/authorization check) before it can finish rendering, which is precisely the kind of timing variance that occasionally lets the second call interrupt the first navigation's still-in-flight transition. A hard refresh always "fixed" it because a full page load never goes through the View Transition API at all. Fix: the experimental flag was removed from `next.config.ts` (confirmed, by direct search, that nothing in the application actually depended on it — no `document.startViewTransition()` call and no custom `::view-transition-*` styling existed beyond one now-also-removed defensive reduced-motion override), which removes the browser mechanism capable of getting stuck, rather than attempting to perfectly re-sequence every `push`-then-`refresh` call site across the eight files where that pattern recurs (a larger, riskier change for the same net effect once the underlying mechanism is gone).

### 10.3 Bugs and evaluation findings carried forward from 07-16 (unchanged, for completeness)

The 07-16 report documents three earlier findings, still true and not superseded: a timezone bug in the calendar view (a UTC-forcing date-key conversion that could shift the displayed date by one day depending on viewer offset), a pinned-scroll-sequence text-ghosting defect on the marketing landing page (both panels of a crossfade transition simultaneously partially visible, misread as overlapping text), and a genuine ML-model export bug caught specifically by a parity test (rounding exported gradient-boosted-tree thresholds to 6 decimal places flipped a branch decision on 1 of 20 held-out rows) — full detail in that report's §10.2–10.4 and `MODEL_CARD.md` §1.4.

### 10.4 What is still not covered

Unchanged from 07-16: there is no CI pipeline running the test suite automatically on every change (§2.4, §9.3); tests are run manually before a phase is considered complete. This remains an honest, explicitly flagged gap.

---

## 11. Results

### 11.1 Quantitative snapshot — measured directly from the repository, 2026-08-24

| Metric | 2026-07-16 (`PROJECT_REPORT.md`) | 2026-08-24 (this report) |
|---|---|---|
| TypeScript/TSX source files (excluding generated Prisma clients) | 319 | **412** |
| Total lines of source code (excluding generated Prisma clients) | ~15,776 | **21,037** |
| API route handler files | 50 | **62** |
| Page routes (`page.tsx`) | 30 | **39** |
| Prisma models | 17 | **21** |
| Prisma enums | 16 | **26** |
| SQLite migrations applied | 7 | **9** |
| PostgreSQL migrations applied (separate history) | 2 | **4** |
| Automated test files | 8 | **14** |
| Automated tests (passing on both SQLite and PostgreSQL, run live) | 68 | **119** |
| User roles | 3 (Farmer / Equipment Owner / Admin) | **4** (Farmer / Rental Owner / Banker / Admin) |
| UI languages | 1 (English) | **3** (English, French, Arabic) — 637 translation keys, verified key-parity |
| Python ML training/data-generation scripts | 5 | 5 (unchanged — no retraining this phase) |

### 11.2 Feature completion matrix — final state

| Feature | Status |
|---|---|
| Auth (register/login/logout, RBAC across 4 roles) | ✅ Complete, re-verified |
| Marketplace — rental | ✅ Complete |
| Marketplace — sale (listing type, condition, price) | ✅ Complete — **new this phase** |
| Financing workflow (request → banker approval → owner visibility) | ✅ Complete, automated-test-covered — **new this phase** |
| Bidirectional reviews (either party to a transaction) | ✅ Complete — **new this phase** |
| Booking/transaction lifecycle incl. conflict-safe approve/reject, same-equipment sale siloing | ✅ Complete, automated-test-covered |
| Reviews / Maintenance / Crop-cycle history / Notifications | ✅ Complete |
| Farms & Fields / Workers / Tasks / Calendar | ✅ Complete |
| Rental Owner console (listings, rental requests, sale offers, owner calendar) | ✅ Complete |
| Banker console (dashboard, financing queue, approved loans) | ✅ Complete — **new role, new this phase** |
| Admin console (users, listings moderation, transactions ledger, activity log) | ✅ Complete — transactions ledger and activity log **new this phase** |
| Onboarding (4 roles) | ✅ Complete |
| Sidebar navigation + 3-tier design system + unified error/loading states | ✅ Complete — **new this phase** |
| Internationalization (EN/FR/AR, RTL) | ✅ Complete, key-parity verified — **new this phase** |
| Live weather (Open-Meteo) + soil (SoilGrids) + historical climate (NASA POWER) | ✅ Complete, unchanged since 07-16, re-verified |
| Irrigation recommendation (FAO-56) | ✅ Complete, unchanged since 07-16 |
| Yield prediction — trained model | ✅ Complete, unchanged since 07-16, re-verified against current source |
| Equipment recommendation — trained classifier + fallback | ✅ Complete, unchanged since 07-16, re-verified against current source |
| Demand forecast — trained seasonal signal | ✅ Complete, unchanged since 07-16, re-verified against current source |
| Chat assistant | ✅ Complete, unchanged since 07-16, re-verified against current source |
| Automated test suite | ✅ Complete — 119 tests, both engines, run live in this audit |
| Session revocation on suspension | ✅ Complete, re-verified |
| Rate limiting | ✅ Complete, re-verified |
| Production secret management | ✅ Complete, re-verified |
| PostgreSQL support | ✅ Complete and tested — **not the default runtime datasource** (§9.4) |
| Map scroll-containment bug | ✅ Found and fixed this phase (§10.2) |
| View-Transition scroll-lock bug | ✅ Found and fixed this phase (§10.2) |
| Payment processing | ❌ Explicitly out of scope, confirmed absent |
| Email/SMS delivery | ❌ Explicitly out of scope, confirmed absent |
| Production deployment/CI pipeline | ❌ Explicitly out of scope, confirmed absent |
| Full LLM-based assistant | ❌ Explicitly out of scope, confirmed absent |

---

## 12. Discussion

### 12.1 What the final phase demonstrates

Extending a working three-role system into a four-role, dual-transaction-type (rent and sale), financing-capable marketplace without regressing the existing rental flow required disciplined schema evolution (widening previously-required `Booking` fields to nullable, checked against every consumer) and a deliberate concurrency/visibility design (the read-time financing filter, §6.3) rather than an easier but more fragile write-time status flag. The architectural correction to the proxy/allow-list mechanism (§5.3) is a genuine example of fixing a class of bug rather than an instance of it — the 07-16 report's own account of "this exact omission caused two real bugs" describes a problem that literally cannot recur under the current single-catch-all design, which is a stronger outcome than adding a checklist reminder. The two bugs found in §10.2 are also representative of a specific, disciplined debugging habit carried through the whole internship: both were root-caused to a specific, named mechanism (a missing CSS containment property plus a stale cached measurement; an experimental browser API's stuck overlay triggered by an unsequenced pair of navigation calls) rather than being described as simply "fixed."

### 12.2 Where the project is honest about its real limits

The AI/ML layer's honestly-reported, moderate accuracy figures from 07-16 are unchanged and were not re-tuned or re-claimed in this phase — no retraining occurred, and this report says so rather than implying continued improvement that did not happen. The PostgreSQL distinction in §9.4 is stated as precisely as possible specifically because "PostgreSQL migration completed" is the kind of claim that is easy to overstate; the honest version — validated and production-viable, but not the default — is the one recorded here. Internationalization covers UI text with verified key-parity, but no claim is made about translation *quality* (the French and Arabic strings were authored, not reviewed by a native-speaking translator) — worth naming as a real, unverified assumption rather than silently implying professional translation review occurred.

---

## 13. Limitations and Future Work

In priority order, based on what would most change the system's real-world readiness — items 1–3 and 5–8 are unchanged in substance from the 07-16 report (re-confirmed still true in this audit); items 4 and 9–10 are new, reflecting what the final phase's own work surfaced:

1. **Per-region yield models** — unchanged from 07-16; still the highest-value next step for the yield model specifically.
2. **A dedicated historical-climate cache/table** for NASA POWER calls — unchanged from 07-16.
3. **Real booking-history-driven demand forecasting**, once real usage history exists — unchanged from 07-16.
4. **A production deployment/CI pipeline**, so the now-119-test suite runs automatically on every change rather than manually — the value of this has grown directly in proportion to the suite's growth from 68 to 119 tests.
5. **Payment integration** — unchanged from 07-16.
6. **Email/SMS delivery** — unchanged from 07-16.
7. **A distributed rate-limit store** (e.g. Redis) if horizontally scaled — unchanged from 07-16.
8. **A full LLM-based conversational assistant** — unchanged from 07-16, still a genuine stretch goal.
9. **Professional review of the French and Arabic translations** — new: the 637 keys are verified for structural completeness (key-parity) but not for translation quality by a native speaker; this is a real, named gap rather than an implied guarantee.
10. **A shared store or Redis-backed rate limiter would now also need to account for the widened role/route surface** (Banker and Admin routes did not exist at 07-16) — noted here as a scope addendum to item 7, not a new independent gap.

---

## 14. Conclusion

By the end of the internship, agriLease is a complete, working implementation of a four-role, dual-transaction-type (rental and sale) agricultural equipment marketplace with an integrated financing pathway, alongside the farm-management system, real external agronomic data integration, and trained machine-learning models already established by the project's midpoint. The final phase's contribution is best summarized as three distinct pieces of real engineering work, each verified rather than asserted in this report: a substantial data-model and permission-system expansion (3 roles → 4, rent-only → rent-and-sale-and-financing, 17 → 21 models, 16 → 26 enums) that did not regress any existing functionality (confirmed by the full, unchanged rental-flow test coverage still passing); an information-architecture and design-system overhaul (sidebar navigation, a three-tier visual hierarchy, a unified error/loading component) that replaced ad hoc, inconsistent patterns found during the pass itself; and full internationalization with verified correctness (key-parity, RTL) rather than a partial or spot-checked translation effort. Two genuine, previously-unreported production bugs were found by driving the finished application as a real user would, and both were fixed at their actual root mechanism rather than patched symptomatically. The test suite grew from 68 to 119 tests and was run live, against both supported database engines, as part of producing this report — not claimed from memory. The remaining gaps (payment processing, email/SMS delivery, a CI/CD pipeline, translation-quality review, and a full LLM-based assistant) are named precisely, are unchanged in kind from what was already known at the project's midpoint (with one genuine addition — translation review), and give a clear, credible, and honestly-scoped picture of the distance between this working system and a fully production-ready commercial deployment.

---

## 15. References

*(Real, checkable technical references used while building the system, carried forward from the 07-16 report plus new entries for tools adopted in the final phase. Add academic/scholarly citations per §3 before submission — this list is not a substitute for a literature review.)*

- Next.js Documentation — https://nextjs.org/docs
- React Documentation — https://react.dev
- Prisma Documentation — https://www.prisma.io/docs
- TanStack Query Documentation — https://tanstack.com/query/latest
- GSAP Documentation (Core, ScrollTrigger, Timeline, React integration) — https://gsap.com/docs/v3/
- Lenis (smooth scroll) — https://lenis.darkroom.engineering/
- Open-Meteo API Documentation — https://open-meteo.com/en/docs
- NASA POWER API Documentation — https://power.larc.nasa.gov/docs/
- SoilGrids (ISRIC) Documentation — https://www.isric.org/explore/soilgrids
- FAOSTAT (Food and Agriculture Organization of the United Nations) — https://www.fao.org/faostat/en/
- Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). *Crop Evapotranspiration — Guidelines for Computing Crop Water Requirements.* FAO Irrigation and Drainage Paper 56.
- scikit-learn Documentation — https://scikit-learn.org/stable/
- OWASP — Session Management Cheat Sheet, Authentication Cheat Sheet — https://cheatsheetseries.owasp.org/
- Zod Documentation — https://zod.dev
- `jose` (JWT library) Documentation — https://github.com/panva/jose
- Vitest Documentation — https://vitest.dev
- **New this phase:** next-intl Documentation — https://next-intl.dev
- **New this phase:** MDN Web Docs — View Transitions API — https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API (referenced while diagnosing the scroll-lock bug, §10.2)
- **New this phase:** Leaflet Documentation — https://leafletjs.com/reference.html (`invalidateSize()`, container sizing behavior — referenced while diagnosing the map scroll-bleed bug, §10.2)
- **New this phase:** MDN Web Docs — CSS `contain` property — https://developer.mozilla.org/en-US/docs/Web/CSS/contain

---

## 16. Appendices

### Appendix A — Full Prisma model list (21)

`User`, `RentalOwnerProfile`, `BankerProfile`, `Farm`, `Field`, `Worker`, `Equipment`, `Task`, `EquipmentAlert`, `EquipmentTrackPoint`, `EquipmentPerformanceSample`, `Booking`, `Review`, `FinancingRequest`, `ActivityLog`, `MaintenanceRecord`, `CropCycle`, `Notification`, `Crop`, `WeatherCache`, `SoilCache`.

*(New since 2026-07-16: `RentalOwnerProfile`, `BankerProfile`, `FinancingRequest`, `ActivityLog`.)*

### Appendix B — Full enum list (26)

`Role`, `VerificationStatus`, `AccountType`, `AdminLevel`, `Locale`, `CropType`, `IrrigationType`, `WaterSource`, `SoilType`, `FieldStatus`, `EquipmentType`, `EquipmentStatus`, `TaskStatus`, `TaskPriority`, `WorkerStatus`, `AlertType`, `AlertSeverity`, `BookingStatus`, `PaymentStatus`, `EquipmentCategory`, `ListingType`, `Condition`, `TransactionType`, `FinancingStatus`, `AdminActionType`, `NotificationType`.

*(New since 2026-07-16: `VerificationStatus`, `AccountType`, `AdminLevel`, `Locale`, `EquipmentCategory`, `ListingType`, `Condition`, `TransactionType`, `FinancingStatus`, `AdminActionType`. `Role` itself changed in place: `EQUIPMENT_OWNER` was renamed `RENTAL_OWNER` and `BANKER` was added.)*

### Appendix C — Route map by role (current, regenerated from `src/lib/constants.ts`)

| Path prefix | Allowed roles |
|---|---|
| `/dashboard` | FARMER, ADMIN |
| `/equipment` | FARMER, RENTAL_OWNER, ADMIN |
| `/ai` | FARMER, ADMIN |
| `/marketplace` | FARMER, RENTAL_OWNER, ADMIN (Rental Owner is view-only — enforced by the API, not the route gate) |
| `/transactions` | FARMER, ADMIN |
| `/financing` | FARMER, ADMIN |
| `/owner` | RENTAL_OWNER, ADMIN |
| `/banker` | BANKER, ADMIN |
| `/admin` | ADMIN |
| `/profile` | FARMER, RENTAL_OWNER, BANKER, ADMIN |
| `/onboarding` | FARMER, RENTAL_OWNER, BANKER |
| `/farms` | FARMER, ADMIN |
| `/workers` | FARMER, ADMIN |
| `/tasks` | FARMER, ADMIN |
| `/calendar` | FARMER, ADMIN |

Prefix matching means a single entry also covers its sub-routes (e.g. `/owner` covers `/owner/sale-offers` and `/owner/calendar`; `/banker` covers `/banker/financing` and `/banker/loans`; `/admin` covers `/admin/transactions` and `/admin/activity-log`).

### Appendix D — Full API route inventory (62 route handler files, current)

`/admin/activity-log`, `/admin/analytics/summary`, `/admin/equipment`, `/admin/equipment/[id]`, `/admin/transactions`, `/admin/users`, `/admin/users/[id]`, `/ai/assistant`, `/ai/forecast`, `/ai/recommendations`, `/ai/yield`, `/auth/language`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/register`, `/banker/dashboard/summary`, `/banker/financing-requests`, `/banker/financing-requests/[id]`, `/banker/loans`, `/bookings`, `/bookings/[id]`, `/bookings/[id]/review`, `/bookings/mine`, `/calendar`, `/crop-cycles/[id]/close`, `/dashboard/summary`, `/equipment`, `/equipment/[id]`, `/equipment/[id]/alerts`, `/equipment/[id]/performance`, `/equipment/[id]/track`, `/farms`, `/farms/[id]`, `/farms/[id]/fields`, `/farms/[id]/soil`, `/farms/[id]/tasks`, `/farms/[id]/weather`, `/farms/[id]/workers`, `/fields/[id]`, `/fields/[id]/crop-cycles`, `/fields/[id]/irrigation`, `/financing-requests/mine`, `/marketplace/equipment`, `/marketplace/equipment/[id]`, `/notifications`, `/notifications/[id]/read`, `/notifications/read-all`, `/owner/bookings`, `/owner/bookings/[id]`, `/owner/calendar`, `/owner/dashboard/summary`, `/owner/equipment`, `/owner/equipment/[id]`, `/owner/equipment/[id]/maintenance`, `/owner/sale-offers`, `/owner/sale-offers/[id]`, `/profile`, `/tasks`, `/tasks/[id]`, `/workers`, `/workers/[id]`.

*(New since 2026-07-16: everything under `/admin/activity-log`, `/admin/transactions`, `/banker/*`, `/financing-requests/mine`, `/owner/calendar`, `/owner/sale-offers/*`, `/profile`.)*

### Appendix E — How to run the project locally (unchanged from 07-16)

```bash
npm install
cp .env.example .env        # fill in a real JWT_SECRET (see the file for how to generate one)
npx prisma migrate deploy   # or: npx prisma migrate dev
npx tsx prisma/seed.ts      # seed demonstration data
npm run dev                 # http://localhost:3000
```

### Appendix F — How to run the tests (unchanged from 07-16)

```bash
npm test                                              # SQLite, self-contained, ~90s, 119 tests
npx vitest run --config vitest.postgres.config.ts     # same suite against Postgres (needs a running instance on :5433)
```

### Appendix G — How to reproduce the trained models (unchanged from 07-16 — no retraining occurred this phase)

```bash
python scripts/ml/build_yield_dataset.py       # real FAOSTAT + NASA POWER data
python scripts/ml/train_yield_model.py
python scripts/ml/generate_synthetic_data.py   # synthetic, clearly labeled
python scripts/ml/train_equipment_classifier.py
python scripts/ml/train_demand_forecast.py
```

### Appendix H — SQLite migration history (9, current)

1. `20260703170406_init`
2. `20260704010319_add_equipment_listing_and_booking`
3. `20260704170513_add_user_suspension_and_equipment_flag`
4. `20260704215635_add_farm_field_extended_attributes`
5. `20260705162623_add_priority2_schema_reconciliation`
6. `20260710005422_add_worker_status_and_general_tasks`
7. `20260716001828_add_weather_forecast_fields`
8. `20260716192717_add_user_preferred_language`
9. `20260804154103_add_four_roles_marketplace_rent_sale_financing`

*(Migrations 1–7 are unchanged from the 07-16 report's Appendix G. Migrations 8–9 are new since that snapshot.)*

### Appendix I — PostgreSQL migration history (4, current, separate — see §9.4)

1. `20260716000515_init`
2. `20260716001925_add_weather_forecast_fields`
3. `20260716192747_add_user_preferred_language`
4. `20260804154200_add_four_roles_marketplace_rent_sale_financing`

### Appendix J — Summary of changes since the 2026-07-16 snapshot (`PROJECT_REPORT.md`)

This appendix exists specifically to make the delta between the two reports easy to lift directly into a "second half of the internship" narrative section of a university-template final report.

**New capabilities:**
- Equipment sale (rent-and/or-sale listings, condition tracking) alongside the original rent-only marketplace.
- A bank-financing workflow, including a new Banker role, with owner visibility gated on financing approval via a read-time query filter.
- A fourth user role (Banker) and a renamed, re-scoped third role (Equipment Owner → Rental Owner).
- Bidirectional reviews (either party to a transaction, not only the renter).
- An admin Transactions ledger and a full Activity Log audit trail.
- A role-aware sidebar navigation, a three-tier card design system, and a unified loading/empty/error-state component, replacing a flat top nav bar and several inconsistent one-off state implementations.
- Full English/French/Arabic internationalization with verified key-parity and right-to-left support.

**Fixed:**
- A map-content scroll-bleed defect (missing CSS containment + stale cached Leaflet container size).
- An intermittent first-load scroll-lock defect (an experimental Next.js flag interacting with an unsequenced navigation call pair).
- The proxy/`ROUTE_ROLE_MAP` allow-list drift risk — architecturally removed, not just patched.

**Unchanged, re-verified rather than re-claimed:**
- The AI/ML module (yield, recommendation, forecast, chat) — mechanism and measured accuracy identical to the 07-16 report.
- The live weather/soil/climate integration.
- The core authentication and session-security mechanisms.
- SQLite as the default runtime datasource; PostgreSQL as a fully tested, non-default alternate.

**Confirmed still out of scope, not silently added or dropped:**
- Payment processing, email/SMS delivery, a production CI/CD pipeline, a full LLM-based assistant.

**Growth, measured:**
- Source files: 319 → 412. Lines of code: ~15,776 → 21,037. API routes: 50 → 62. Pages: 30 → 39. Prisma models: 17 → 21. Prisma enums: 16 → 26. Automated tests: 68 → 119 (all passing on both database engines, confirmed live on 2026-08-24).
