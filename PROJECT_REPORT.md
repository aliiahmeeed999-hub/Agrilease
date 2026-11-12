# agriLease — A Full-Stack Digital Platform for Agricultural Equipment Rental and Farm Management

**[University Name]**
**[Faculty / Department Name]**
**[Degree Programme]**

Submitted by: **[Your Full Name]** — **[Student ID]**
Supervisor: **[Supervisor Name]**
Academic Year: **[20XX / 20XX]**
Date: **[Submission Date]**

> This document is a factual engineering report generated from a direct audit of the project's source code, database schema, configuration, and test suite as of **2026-07-16**. Every claim about what is implemented, partially implemented, or not implemented was verified against the actual codebase (file reads, greps, a working `tsc` type-check, and live end-to-end checks against real external APIs) rather than assumed. Sections that a university template normally requires but that cannot be honestly generated from the codebase alone — a Literature Review with real scholarly citations, and the final Reference list — are left as clearly marked placeholders for you to complete with your own course readings. Fabricating citations would be an academic-integrity risk, so none are invented here.
>
> This report covers the system through four build phases: (1) security/production hardening, (2) real weather/soil/climate data integration, (3) trained machine-learning models replacing the original heuristics, and (4) explicit scoping of what remains deliberately unbuilt. Model training details, dataset provenance, and evaluation metrics are documented in full in the companion **`MODEL_CARD.md`** — this report summarizes them but treats that file as the source of truth for exact numbers.

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

agriLease is a full-stack web application designed for the Moroccan agricultural sector, combining two functions that are usually offered by separate products: a **peer-to-peer equipment rental marketplace** (connecting equipment owners with farmers who need to rent tractors, harvesters, sprayers, and other machinery) and a **farm management system** (fields, crop cycles, workers, tasks, and a calendar), enriched with a **real weather/soil/climate data layer** and **trained machine-learning models**. The platform serves three user roles — farmer, equipment owner, and administrator — each with a distinct, permission-gated set of screens.

The system is built on Next.js 16 (App Router) with React 19 and TypeScript, backed by a Prisma 7 ORM layer supporting both SQLite (local development) and PostgreSQL (tested in parallel — see §9.5). Authentication uses signed JWT session cookies with bcrypt-hashed passwords, immediate session revocation on account suspension, rate limiting, and server-enforced, two-layer role-based access control. The application's planning-assistance module now combines: a gradient-boosted yield-prediction model trained on real FAOSTAT crop-yield and NASA POWER climate data; a decision-tree equipment-recommendation classifier trained on realistic synthetic data (with the original rule-based logic retained as a confidence-gated fallback); a seasonal demand-forecasting model; live weather (Open-Meteo), historical climate (NASA POWER), and soil (SoilGrids) integration, including an irrigation-need estimate derived from the published FAO-56 Penman/Hargreaves methodology; and a rule-based conversational assistant now grounded in all of the above rather than static text.

This report documents the system's architecture, data model, and feature set; the reasoning behind key implementation decisions (atomic conflict-safe booking transitions, a feature-sliced frontend structure, a scoped GSAP/Lenis animation system); and — consistently with every phase of this project — an honest account of what was measured rather than assumed, including two real, reported negative findings from the machine-learning work (a linear yield model that fit far worse than the served gradient-boosted one, and a first-draft demand-forecast model that initially performed *worse* than a naive baseline) and how each was diagnosed and addressed rather than hidden.

---

## 2. Introduction

### 2.1 Background and Motivation

Small and medium-sized Moroccan farms frequently cannot justify the capital cost of owning specialized equipment (tractors, harvesters, sprayers, irrigation pumps) that is only needed for short, seasonal windows. Equipment owners, in turn, often have machinery sitting idle between jobs. A digital marketplace that matches idle equipment with short-term demand addresses a real allocative-efficiency problem in the sector. Separately, many small farms manage their fields, crop cycles, and labor with no digital system at all — paper records, memory, or nothing, and have no easy access to the kind of real weather/soil/yield data that could inform planting, irrigation, and equipment decisions.

agriLease was built to address these problems in a single platform, on the reasoning that a farmer who is already tracking their fields and crops in the same system that lets them rent equipment is more likely to use both features consistently, and that real external data (climate, soil) plus the platform's own usage data (which tasks are upcoming, what equipment is due for maintenance) can directly improve the quality of both planning guidance and rental recommendations.

### 2.2 Problem Statement

The project set out to answer: *can a single, coherent web application provide (a) a trustworthy rental marketplace with a real booking lifecycle and conflict handling, (b) genuine farm-management record-keeping, (c) real external agronomic data (weather, soil, historical climate), and (d) genuinely trained planning-assistance models — while remaining honest about each model's real, measured accuracy and limitations, and about the system's production-readiness — within a realistically scoped, single-developer-buildable project?*

### 2.3 Objectives

1. Design and implement a relational data model covering users, farms, fields, workers, tasks, equipment, bookings, reviews, maintenance, crop cycles, and notifications.
2. Implement secure authentication and strict, server-verified, two-layer role-based access control, with immediate session revocation and rate limiting.
3. Build a real booking lifecycle (request → approve/reject → completion → review) with correct handling of concurrent booking requests for the same equipment and date range.
4. Build farm-management features (farms/fields CRUD, crop-cycle history, worker management, task management, an aggregating calendar) as first-class, not placeholder, functionality.
5. Integrate real, live external agronomic data (current weather, historical climate, soil composition) with sensible caching and graceful degradation.
6. Train and honestly evaluate machine-learning models for yield prediction, equipment recommendation, and demand forecasting, replacing the original heuristics where a trained model genuinely helps, and retaining the heuristics as a documented, principled fallback where it doesn't.
7. Apply a consistent design system and a deliberately *scoped* motion/animation layer (GSAP + Lenis) — expressive on the public marketing site, restrained and single-purpose on authenticated, task-driven screens.
8. Identify, and honestly report, every remaining gap between this system's current state and a fully production-ready deployment.

### 2.4 Scope

In scope: the three-role marketplace and farm-management application described above, running against SQLite or PostgreSQL (§9.5), with real weather/soil/climate data integration (§8), trained ML models for yield, equipment recommendation, and demand forecast (`MODEL_CARD.md`), an automated test suite, and hardened authentication (session revocation, rate limiting, secret management).

**Explicitly out of scope, stated as such rather than silently omitted**, each with what adopting it later would concretely require:

- **Payment processing/settlement.** `Booking.paymentStatus` exists as a field but no payment gateway is integrated — rentals track price/status only, no money actually moves through the platform. Integrating a real gateway (e.g. Stripe) would require: a Stripe account + API keys managed the same way `JWT_SECRET` is (`.env.example`, never committed), a webhook endpoint to reconcile async payment-confirmation events with `Booking.paymentStatus`, and a decision on how deposits/refunds map to the existing `depositMad` field.
- **Email/SMS delivery.** Notifications are in-app only (`Notification` table, bell dropdown) — no email or SMS ever leaves the system, even for time-sensitive ones like a rental approval. Adding it would require a transactional email/SMS provider (e.g. SendGrid for email, Twilio for SMS), a template layer, and a delivery-preferences field on `User` (a user must be able to opt in/out per channel).
- **A production deployment/hosting pipeline.** No CI/CD, no hosting target has been chosen or configured.
- **A full LLM-based conversational assistant.** The chat assistant (§8.5) remains keyword/intent-classification based, now grounded in live and trained data rather than static text, but is not backed by a large language model — explicitly scoped as a stretch goal, not attempted.

---

## 3. Related Work

*(This section is intentionally left as a guided outline rather than a filled-in literature review. A trustworthy academic report needs real, checkable citations to papers, textbooks, or documented commercial systems — those must come from your own course readings and library research, not be invented. Below is the shape of the section and the categories worth researching and citing.)*

### 3.1 Categories to research and cite

- **Peer-to-peer / sharing-economy equipment rental platforms** — general marketplace literature (two-sided markets, trust and reputation mechanisms) applied to heavy equipment; commercial examples exist internationally and regionally that can be compared feature-for-feature against agriLease's booking model (§7.3).
- **Farm management information systems (FMIS)** — academic and industry literature on digitizing field/crop record-keeping for smallholder agriculture, and the documented barriers to smallholder adoption (connectivity, literacy, cost) that motivate a mobile-friendly, low-complexity UI.
- **Precision agriculture data sources** — Open-Meteo (current weather), NASA POWER (historical climate), and SoilGrids (soil properties) are real, open, freely-licensed public APIs that this project now actually calls live (§8.6) rather than only designing a schema around — worth citing their documentation and, where available, the underlying scientific papers behind each dataset (e.g. SoilGrids' methodology papers, NASA POWER's source reanalysis datasets).
- **Agricultural yield modeling** — academic literature on climate-yield relationships and the well-documented difficulty of predicting yield from climate alone across heterogeneous regions (relevant directly to the honestly-reported, modest R² values in §8.2 and `MODEL_CARD.md` §1.3) — this project's own empirical finding (weak cross-country climate-only R²) is a small, self-contained illustration of a much larger, well-studied phenomenon in this literature.
- **Reference evapotranspiration and irrigation scheduling** — FAO Irrigation and Drainage Paper 56 (Allen et al., 1998) is the direct source for the Hargreaves-Samani reference-evapotranspiration formula and crop coefficients used in §8.6's irrigation estimate — a real, citable, standard agronomic reference, not informally derived.
- **Task scheduling / fleet-telematics systems** — general literature on maintenance-due scheduling and equipment-task fit scoring, relevant to comparing agriLease's hybrid rule-based/ML recommendation engine (§8.3) against more sophisticated approaches.
- **Web application security baselines** — OWASP's guidance on session management, password storage, and access control is directly relevant to §9 and is safe to cite (it is a real, stable, citable reference — see §15).

### 3.2 Positioning of this project

Relative to a full commercial FMIS or telematics platform, agriLease's contribution is the **integration** of a rental marketplace, farm management, real external agronomic data, and genuinely trained (not merely designed-for) ML models in one data model and one UI, with a transparent, from-scratch implementation of the full stack (auth, RBAC, transactional booking logic, data pipelines, model training, and UI) rather than reliance on a third-party backend-as-a-service or an unevaluated "AI" label. Its ML layer is small-scale and honestly evaluated rather than state-of-the-art — the contribution is the complete, working, and honestly-documented pipeline (real data → trained model → served inference → measured accuracy → UI transparency about which predictions are model-backed), not a claim of novel machine-learning research.

---

## 4. Methodology

### 4.1 Development approach

The system was built iteratively, in explicit, user-reviewed phases rather than as a single big-bang implementation:

1. **Foundation** — project scaffold (Next.js App Router, TypeScript, Tailwind CSS 4), authentication, the User/Role model, and route-level access control.
2. **Core domain** — Equipment, Booking, and the marketplace/rental flow; Farm/Field CRUD; the dashboard.
3. **Schema completion** — Review, MaintenanceRecord, CropCycle, and Notification, which initially existed only as Prisma models with seed data and no UI or API surface, were built out into fully functional features end-to-end.
4. **Farm-management expansion** — Workers, Tasks, and a Calendar aggregation view were added after the schema was audited and safely extended (the `Task` model was widened from an equipment-only work-log to a general farm task, confirmed safe against all four existing consumers before the change).
5. **Design and motion audit** — a dedicated pass auditing every GSAP/Lenis animation against the official GSAP skill guides, correcting React-cleanup patterns, performance issues, and clarifying the scope boundary between marketing-site choreography and restrained, single-pattern motion on authenticated screens.
6. **Security and production-readiness hardening** — JWT secret management with a startup guard, immediate session revocation on suspension, rate limiting, an automated test suite (Vitest), and parallel PostgreSQL support, all actually implemented and tested rather than only proposed (§9).
7. **Real weather/soil/climate integration** — live Open-Meteo current-conditions data, NASA POWER historical climate, SoilGrids soil composition, all cached with TTL and graceful stale/unavailable fallback; an irrigation-need estimate built on the published FAO-56 methodology (§8.6).
8. **Machine learning** — a real, trained gradient-boosted yield model (FAOSTAT + NASA POWER data), a trained equipment-recommendation classifier and demand-forecast model (realistic synthetic data, clearly labeled as such), each served via a hand-written TypeScript inference engine with no Python runtime in production, and each verified for exact numerical parity against the original Python-trained model rather than assumed to have ported correctly (§8, `MODEL_CARD.md`).
9. **Scope confirmation** — payment processing, email/SMS delivery, and a full LLM-based assistant confirmed and documented as deliberately out of scope, each with a concrete note on what adopting them later would require (§2.4).
10. **Verification passes** — role-gating regression checks, a real Chromium-driven performance baseline, targeted bug hunts (e.g. the pinned-sequence crossfade defect and a timezone-handling bug, §10.2–10.3), and live end-to-end checks of every new external-data and ML feature against the real internet, not just mocked tests (§10.5).

### 4.2 Tools used

| Purpose | Tool |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI library | React 19 |
| Styling | Tailwind CSS 4 |
| Component primitives | Base UI (via a `shadcn`-style component generator, `base-nova` style) |
| ORM / database | Prisma 7, SQLite (`@prisma/adapter-better-sqlite3`) and PostgreSQL (`@prisma/adapter-pg`) in parallel — §9.5 |
| Server state / data fetching | TanStack Query 5 |
| Forms & validation | React Hook Form + Zod |
| Authentication | `jose` (JWT signing/verification), `bcryptjs` (password hashing) |
| Animation | GSAP 3 (+ `@gsap/react`, ScrollTrigger, SplitText, Flip), Lenis (smooth scroll) |
| Maps | Leaflet / React-Leaflet |
| Charts | Recharts |
| Calendar UI | `react-day-picker` (via shadcn) |
| Automated testing | Vitest (68 tests, run against both SQLite and Postgres) |
| ML training (offline, not a production dependency) | Python 3.12, scikit-learn, pandas, numpy, Faker |
| External data APIs | Open-Meteo, NASA POWER, SoilGrids, FAOSTAT |
| Manual/scripted verification | Playwright (driven ad hoc via Node scripts, plus real end-to-end smoke tests against live external APIs) |

### 4.3 Verification philosophy

Rather than accepting a change as "done" once it compiled, each feature pass in this project was closed out against multiple checks: a clean `tsc --noEmit`, a clean `next lint`, an automated Vitest run (§10), and — for anything touching a live external API or a trained model — an actual live invocation over the real internet with real data inspected in the response, not merely a mocked test passing. Where a model or algorithm was ported from Python to TypeScript, a dedicated parity test checks the TypeScript output against the original Python model's output on real held-out data, not just "looks reasonable" (§8, §10.5) — this practice caught a real, non-hypothetical bug (§8.2).

---

## 5. System Design and Architecture

### 5.1 High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                                │
│   React 19 client components + TanStack Query cache              │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTPS (dev: HTTP) fetch
┌───────────────────────────────▼───────────────────────────────────┐
│                    Next.js 16 (App Router)                        │
│  ┌───────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │ (marketing)   │  │ (auth)             │  │ (app)             │ │
│  │ public landing│  │ login / register  │  │ role-gated screens│ │
│  └───────────────┘  └────────────────────┘  └───────────────────┘ │
│  proxy.ts (Next.js Proxy, Node.js runtime) —                      │
│    rate limiting (all /api/*) + JWT verify + suspension check +   │
│    ROUTE_ROLE_MAP gate, in that order                             │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  /api/* route handlers (50 files) — requireCurrentUser() + │   │
│  │  requireRole() re-checked per request, Zod-validated input │   │
│  └────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  src/lib/ai/* — trained-model inference (GBM/tree engines) │   │
│  │  src/lib/{weather,soil,nasaPower,irrigation}.ts — live APIs │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ Prisma Client (dual adapter, §9.5)
┌───────────────────────────────▼───────────────────────────────────┐
│              SQLite (dev.db) or PostgreSQL (DATABASE_PROVIDER)     │
│      17 models / 16 enums — see §6 for the full data model        │
└─────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ offline, one-time training
                    ┌────────────┴────────────┐
                    │  scripts/ml/*.py         │
                    │  FAOSTAT · NASA POWER ·  │
                    │  synthetic generators    │
                    │  → src/lib/ai/*.json     │
                    └──────────────────────────┘
```

### 5.2 Route groups

Next.js route groups separate the three distinct "surfaces" of the app without affecting the URL path:

- **`(marketing)`** — the public landing page. Uses Lenis smooth scrolling and GSAP-driven storytelling sections (parallax layers, a pinned scroll-scrubbed sequence, a magnetic CTA button, split-character headline reveal). No authentication required.
- **`(auth)`** — `/login`, `/register`. Standalone, unauthenticated forms.
- **`(app)`** — every authenticated screen (dashboard, marketplace, rentals, equipment, farms, workers, tasks, calendar, AI module, owner console, admin console, onboarding). Shares a single layout (`TopNav` + role-aware navigation + notification bell) and is protected both by the proxy and by per-route API checks.

### 5.3 Defense-in-depth access control

Access control is checked in multiple layers, not once:

1. **Rate limiting** (`src/lib/rate-limit.ts`, applied in `src/proxy.ts` to every `/api/*` request): an in-memory fixed-window limiter — a stricter combined budget (10 req/min/IP) on `/api/auth/login` and `/api/auth/register` specifically, a generous general budget (240 req/min/IP) on everything else, returning real `429` responses with `Retry-After`. Documented limitation: in-memory state does not coordinate across multiple server processes/instances — a horizontally-scaled deployment would need a shared store (e.g. Redis).
2. **Proxy layer** (`src/proxy.ts` — Next.js 16 renamed "middleware" to "proxy"; confirmed via that version's own documentation, not assumed from prior familiarity with the older convention): every request matching a path in `config.matcher` has its session JWT verified, its **suspension status re-checked against the database on every gated navigation** (not just at login — §9.2), and its role checked against `ROUTE_ROLE_MAP` before the page is ever rendered. The allow-list (`ROUTE_ROLE_MAP` in `src/lib/constants.ts`) and the proxy's `matcher` array are two separate lists that must be kept in sync by hand — this exact omission caused two real, caught-in-testing bugs earlier in the project, which is why every new route added since has been explicitly checked against both lists as a required step, not an afterthought.
3. **API layer**: every route handler independently calls `requireCurrentUser()` (throws `401` if the session is missing/invalid **or the user is suspended**) and, where relevant, `requireRole(user, [...])` (throws `403` if the role isn't allowed) — so even if the proxy layer were ever bypassed or misconfigured, the API itself does not trust the request.

### 5.4 Frontend structure (feature-sliced)

```
src/
├── app/              Next.js routes — pages + API route handlers only, no business logic
├── features/<domain>/
│   ├── components/   presentational + form components for that domain
│   └── hooks/        TanStack Query hooks (data fetching, cache invalidation)
├── services/         thin fetch wrappers per domain, all funneled through api-client.ts
├── types/            shared TypeScript types per domain
├── components/       cross-domain UI: layout shell, motion primitives, generic ui/ (shadcn)
├── lib/               auth, rate limiting, Prisma client, AI/ML inference, weather/soil/
│                      climate integration, notification reconciliation, constants
└── hooks/            small cross-cutting hooks (reduced-motion detection, scroll reveal, smooth scroll)
```

This structure keeps each domain self-contained: a new feature typically means one new folder under `features/`, one service file, one or two API route files, and (where needed) one Prisma model — a repeatable, low-ambiguity pattern followed consistently across every feature added across all four phases, including the ML/external-data work (`src/lib/weather.ts`, `soil.ts`, `nasaPower.ts`, `irrigation.ts`, `ai/gbm.ts`, `ai/classificationTree.ts` all follow the same `lib/`-for-server-logic convention as the pre-existing `ai/yield.ts`).

---

## 6. Data Model

The Prisma schema (`prisma/schema.prisma`) defines **17 models** and **16 enums**, evolved over **7 SQLite migrations** (plus a parallel, separately-tracked **2-migration PostgreSQL history** — §9.5). It is provider-agnostic Prisma syntax; the datasource provider is generated into two separate clients, one per engine (§9.5).

### 6.1 Entity summary

| Model | Purpose |
|---|---|
| `User` | Account record; `role` (FARMER / EQUIPMENT_OWNER / ADMIN), `isSuspended` flag (now enforced per-request, not just at login — §9.2), credentials |
| `Farm` | A farmer's farm — location, size, soil/irrigation/water-source metadata |
| `Field` | A parcel within a farm — crop type, area, polygon geometry, growth status |
| `Worker` | Farm labor — name, title, on-duty/active/on-leave status |
| `Equipment` | A rentable machine — type, specs, listing status, current farm location |
| `Task` | A unit of work — optionally linked to equipment (a work-session log), a field, and/or a worker; status/priority-tracked |
| `EquipmentAlert` | Operational alerts (hydraulic pressure drop, GPS instability, etc.) |
| `EquipmentTrackPoint` | GPS breadcrumb samples for the equipment map |
| `EquipmentPerformanceSample` | Daily running-hours / distance / efficiency samples |
| `Booking` | A rental request/agreement between a renter and a piece of equipment, with a status lifecycle |
| `Review` | A 1–5 rating + comment, one per completed booking |
| `MaintenanceRecord` | Service history for a piece of equipment, with a next-due date |
| `CropCycle` | A planting-to-harvest cycle for a field, with expected/actual yield |
| `Notification` | In-app notification, typed, read/unread |
| `Crop` | Reference data — per-crop-type agronomic constants |
| `WeatherCache` | Per-farm current-conditions snapshot from Open-Meteo — **live and populated** (extended this phase with `rainProbabilityPct`, `isFrostRisk`, `isHeatRisk`) |
| `SoilCache` | Per-farm soil composition from SoilGrids — **live and populated** (pH, nitrogen, organic matter; phosphorus/potassium/soil-moisture deliberately left `null` — SoilGrids has no such property, and no mislabeled proxy is substituted, §8.6) |

### 6.2 Notable relational design decisions

- **`Task.equipmentId` and `Task.workerId` are both optional**, allowing one model to represent equipment work-logs (used for running-hours statistics), general farm to-dos, or both. This was a deliberate, audited schema widening: before making `equipmentId` optional, every existing consumer of `Task` was individually checked to confirm none assumed a non-null value.
- **`Booking` → `Review` is a one-to-one, gated relation**: a review can only be created for a booking that is `APPROVED` and whose `endDate` has already passed (`isBookingReviewEligible`, `src/lib/booking.ts`), preventing reviews on active or never-approved rentals — verified by an automated test (§10).
- **Cascading deletes are scoped deliberately**: deleting a `Farm` cascades to its `Field`, `Worker`, and `Task` rows and nulls out `Equipment.currentFarmId` — a real, multi-model blast radius identified during design and explicitly deferred (no farm-delete endpoint exists yet) rather than implemented carelessly.
- **Enums are stored as plain `TEXT` under SQLite** but as native `CREATE TYPE ... AS ENUM` under PostgreSQL — a real, empirically-confirmed engine difference (not merely theoretical) that was the concrete reason the PostgreSQL migration path (§9.5) was actually tested end-to-end rather than assumed equivalent from Prisma's provider-agnostic schema syntax alone.

---

## 7. Implementation

### 7.1 Authentication and session management

- Passwords are hashed with `bcryptjs` before storage; plaintext passwords are never persisted.
- On successful login, a JWT (HS256, signed via `jose`) is issued containing `sub`, `email`, `role`, and `fullName`, with a 7-day expiration, stored in an HTTP-only session cookie.
- **`JWT_SECRET` is guarded at startup** (`src/lib/auth/jwt.ts`): the app refuses to start outside `NODE_ENV=development` if the secret is missing or still equals the removed literal dev placeholder — a real, functioning startup check, not just a documentation note.
- **Session revocation is immediate, not just at login**: `isUserSuspended()` (`src/lib/auth/suspension.ts`) is checked both in `requireCurrentUser()` (every API call) and directly in `src/proxy.ts` (every gated page navigation, via a direct Prisma query — safe because Next.js 16's proxy runs in the Node.js runtime by default, confirmed from that version's own documentation before relying on it). A session issued before a suspension is rejected on the very next request, not after its full 7-day natural expiry. The accepted tradeoff (documented in code): a DB round-trip per authenticated request, versus the added complexity of a token-versioning/blacklist scheme — reasonable at this app's scale.

### 7.2 Role-based feature set

**Farmer**
- Dashboard: live stat tiles, an interactive field map (Leaflet), a workload chart, equipment-readiness indicators, and now a live current-weather card for the farmer's primary farm — all backed by real data queried per-request.
- Farms & Fields: full CRUD, including server-side computation of a real, area-proportional field polygon; each farm detail page now also shows a live weather card and a live soil-composition card (§8.6).
- Crop-cycle history per field, including a close-out flow for recording actual yield at harvest; each field row now also has an expandable **irrigation recommendation panel** (§8.6).
- Workers: CRUD, each worker row showing a live reverse-lookup of their currently assigned tasks.
- Tasks: CRUD with status transitions, priority levels, and optional links to a field and/or worker.
- Calendar: an aggregating month view pulling from task due dates, crop-cycle planting/harvest dates, and booking start/end dates.
- Marketplace: browse/filter/search available equipment and submit booking requests.
- Rentals: view "my bookings," cancel a pending request, and leave a review once a completed rental's end date has passed.
- AI module: yield outlook (now model-backed, §8.2), equipment-task recommendations (now hybrid classifier + rule-based fallback, §8.3), an 8-week demand forecast (now with an added trained seasonal-trend signal, §8.4), and a chat assistant grounded in all of the above plus live weather/soil (§8.5).
- Notifications: a bell/dropdown backed by the `Notification` table, generated lazily for harvest reminders, newly-available equipment, and tasks due soon.

**Equipment Owner**
- Owner dashboard and fleet listing management (create, edit rate, list/unlist).
- Booking management: approve/reject pending requests.
- Maintenance logging: service records per piece of equipment, feeding a "maintenance due soon" penalty into the recommendation scoring.

**Administrator**
- Platform analytics summary, user management (suspend/reactivate — now with immediate effect, §9.2), equipment management (flag/unflag).

**Onboarding** — a soft, skippable first-run nudge shown once after registration.

### 7.3 The booking lifecycle and its concurrency handling

A booking moves `PENDING → APPROVED/REJECTED`, and a `PENDING` booking can be `CANCELLED` by its renter. The owner-facing approve/reject endpoint uses an **atomic conditional update** inside a Prisma transaction — the "is this booking still `PENDING`?" check and the status write happen as a single `updateMany` call with both conditions in its `WHERE` clause, closing a real race-condition window a naive read-then-write would leave open. When a booking is approved, any other still-`PENDING` booking for the same equipment with an overlapping date range is automatically rejected in the same transaction. This exact behavior — including the conflict-safe rejection and the double-approve-attempt guard — is now covered by automated tests (§10).

### 7.4 Notifications

Because the stack has no background job scheduler, date-driven notifications are generated **lazily**: `reconcileNotifications(userId)` runs whenever a user's notification list is fetched, checks each rule against current data, and creates a notification only if one with the same title doesn't already exist. Event-driven notifications (a rental being approved) are created synchronously inside the action that causes them.

### 7.5 Motion and design system

GSAP and Lenis are used, but deliberately **scoped**: Lenis and the more elaborate scroll-driven choreography are confined to the public marketing site. Authenticated, task-driven screens deliberately avoid that heavier choreography, with one documented exception — a single "reveal on scroll into view" pattern allowed on data-heavy result screens like the AI stat-card grids. This boundary is documented directly in the repository's agent/contributor instructions.

---

## 8. Artificial Intelligence and Machine Learning Components

This section summarizes what each planning-assistance feature actually does and how well it actually performs, measured, not asserted. **`MODEL_CARD.md` is the authoritative source** for exact datasets, preprocessing steps, and evaluation metrics — this section gives the same honest account at a level appropriate for this report, and defers to that file for full detail and reproduction instructions.

### 8.1 What changed this phase, in one line each

| Feature | Before | Now |
|---|---|---|
| Yield prediction | Fixed base rate × deterministic hash-based "variance" | Gradient-boosted model trained on real FAOSTAT yields + real NASA POWER climate, fed each field's own live recent climate |
| Equipment recommendation | Keyword-matched title → fixed ideal-type list | A trained classifier (realistic synthetic data) tried first; falls back to the original keyword rule when confidence is low or required data is missing |
| Demand forecast | Fixed hand-authored hours-per-hectare tables | Same field-specific forecast, **plus** a new, separate trained seasonal-trend signal from synthetic rental history |
| Chat assistant | Templated replies from the three heuristics above | Same templating mechanism, now also answering real weather/soil questions and stating which numbers are model-backed |
| Weather/soil data | `WeatherCache`/`SoilCache` existed in the schema, populated by nothing | Live Open-Meteo current conditions and SoilGrids soil composition, cached with TTL and stale/unavailable fallback |

### 8.2 Yield prediction (`src/lib/ai/yield.ts`, `MODEL_CARD.md` §1)

Trained on 1,892 real rows: FAOSTAT reported crop yields (5 crop types, 17 countries, 2000–2023) joined with real NASA POWER historical climate for the exact country and year each row belongs to (a feature genuinely tried and dropped: FAOSTAT's country-level "area harvested," which isn't a meaningful predictor of one field's per-hectare rate and isn't something a farmer could ever supply). A gradient-boosted regression tree ensemble (scikit-learn, one per crop) is trained and evaluated on a held-out 20% split; a plain linear regression was also trained purely for comparison and fit far worse (R² as low as 0.02, negative for olives, versus 0.33–0.66 for the served GBM — see `MODEL_CARD.md` §1.3 for the full per-crop table). **This is reported honestly as a real, modest result**, not inflated: climate alone explains only part of real-world cross-country yield variance, which is well-documented in the agricultural economics literature (§3.1) and not a defect in this implementation.

The trained model is served via a hand-written TypeScript tree-traversal engine (`src/lib/ai/gbm.ts`) — no Python/ONNX runtime in production — fed each field's own trailing-365-day real NASA POWER climate at request time. **A parity test against scikit-learn's own output caught a real bug**: rounding exported tree thresholds to 6 decimal places flipped a branch decision on 1 of 20 held-out rows, silently producing a materially wrong prediction; fixed by exporting full floating-point precision (`MODEL_CARD.md` §1.4). The `OTHER` crop type (no representative FAOSTAT item exists) and any case where the live climate fetch fails both fall back to the original heuristic — every prediction carries a `modelBacked: boolean` shown directly in the UI, never hidden.

### 8.3 Equipment recommendation (`src/lib/ai/recommendations.ts`, `MODEL_CARD.md` §2)

There is no public dataset of real equipment-rental choices, so training data is **generated synthetically** (`scripts/ml/generate_synthetic_data.py`) — labeled as such everywhere, never presented as observed. The generator encodes a real, deliberate agronomic distinction (olive harvest is realistically tractor-led, not harvester-led the way cereal-crop harvest is) as a sampling distribution, not a hard rule, producing a genuinely imperfectly-separable classification problem. A single decision tree is served (64.4% held-out accuracy; a comparison random forest reaches 71.3% but isn't served, for simplicity of the TypeScript port). The classifier is tried only when a task has a linked field/crop type it was trained on, a farm size, and a date; below a 0.5 confidence threshold, or when required inputs are missing, it **falls back to the original keyword-matching rule** — verified live: a real "Harvest olives" task correctly recommended a tractor (not a harvester) at 58% confidence, the exact distinction the model was trained to capture.

### 8.4 Demand forecasting (`src/lib/ai/forecast.ts`, `MODEL_CARD.md` §3)

The original field-specific, hours-needed-per-week forecast is unchanged. A **new, separate** `platformSeasonalTrend` signal is added alongside it, trained on synthetic multi-year rental history as a smoothed (±2-week moving average) seasonal climatology. **A real negative result shaped this model's final form**: the first version (2 training years, no smoothing) scored *worse* than a naive no-seasonality baseline on held-out data (RMSE 1.99 vs. 1.53) — root-caused to too little data combined with deliberate year-to-year timing jitter in the generator, and fixed with more training years and smoothing. The fixed version is still only roughly on par with the naive baseline (RMSE 1.361 vs. 1.332) — reported exactly as measured, not tuned further until it looked better, since doing so would risk overfitting the evaluation itself. The two signals are kept visibly distinct in the API and UI rather than blended into one number, since blending a field-specific hours estimate with a platform-wide relative trend would misrepresent both.

### 8.5 The chat assistant (`src/lib/ai/assistant.ts`)

Still keyword/regex intent classification with templated replies — no LLM, no external AI API call, exactly as before. What changed: replies now say whether a yield figure is model-backed, mention the trained seasonal-demand signal, and two new intents (WEATHER, SOIL) answer real questions using live Open-Meteo/SoilGrids data for the farmer's primary farm, explicitly saying so when no data is available rather than fabricating an answer.

### 8.6 Real weather, climate, and soil integration (`src/lib/weather.ts`, `soil.ts`, `nasaPower.ts`, `irrigation.ts`)

- **Weather** (Open-Meteo): current temperature, humidity, wind, pressure, rainfall, today's rain probability, and frost/heat-risk flags (documented fixed thresholds), cached per farm for 1 hour with fallback to the last-known reading (marked `stale: true`) if a refresh fails.
- **Soil** (SoilGrids): pH, nitrogen, and organic matter (converted from soil organic carbon via the standard Van Bemmelen factor), cached for 30 days. Phosphorus, potassium, and live soil moisture are deliberately left `null` — SoilGrids has no such property, and no mislabeled proxy is substituted. A real, reproducible SoilGrids data gap near coastlines/urban areas was found and is handled explicitly (a genuine "no data here" state, distinct from a fetch failure).
- **Historical climate** (NASA POWER): feeds both the yield model (§8.2) and the irrigation estimate below; not cached in a dedicated table this phase (documented as a reasonable follow-up if call volume grows).
- **Irrigation recommendation** (a "nice to have" item, delivered): combines real NASA POWER daily temperature/rainfall, the published FAO-56 Hargreaves-Samani reference-evapotranspiration formula (real solar-geometry astronomy, not an API call), published FAO-56 per-crop coefficients, and real SoilGrids field-capacity/wilting-point data for a water-holding-capacity estimate — shown as an expandable panel per field, verified live end-to-end (e.g. a real Moroccan wheat field returning a genuine 234.9mm/14-day net irrigation need).

All three live integrations were verified against the real internet, not only mocked tests (§10.5).

---

## 9. Security

### 9.1 What is implemented

- Password hashing via bcrypt, never plaintext storage.
- Signed, expiring (7-day) JWT session cookies (HS256 via `jose`), with a **startup guard** refusing to boot with a missing or placeholder secret outside development.
- **Immediate session revocation on suspension** — checked on every authenticated request and every gated page navigation, not just at login (§7.1, §9.2).
- **Rate limiting** on all API routes, with a stricter combined budget on the two credential-stuffing/spam-prone endpoints (§5.3).
- Two-layer role-based access control (proxy + per-route API checks), with three distinct roles.
- Input validation on every mutating API route via Zod schemas.
- Prisma's parameterized query layer removes classic SQL-injection risk.
- React's default output escaping mitigates standard reflected-XSS vectors.
- `.env.example` documents every required environment variable; `.env` itself is git-ignored (with an explicit exception carved out so `.env.example` remains trackable — a real bug in the original `.gitignore` glob, found and fixed this phase).
- An automated test suite (§10) covering auth, booking, and every new external-data/ML function.
- Both SQLite and PostgreSQL are supported and tested (§9.5).

### 9.2 What was a gap and is now closed, with the reasoning behind each fix

| Gap (as reported previously) | Resolution |
|---|---|
| No live session revocation | `isUserSuspended()` checked per-request in both the API layer and the proxy layer (§7.1) — tradeoff accepted: a DB round-trip per request, versus token-versioning complexity, reasonable at this scale. |
| No automated test suite | Vitest, 68 tests, run against a real ephemeral SQLite DB per run and against real Postgres — not mocked query layers. |
| No rate limiting | In-memory fixed-window limiter in the proxy (documented multi-instance caveat, §5.3). |
| Development-only JWT secret, no `.env.example` | Real generated secret in `.env`, `.env.example` added, a functioning startup guard added. |
| SQLite only, Postgres unattempted | Both supported via a `DATABASE_PROVIDER` env var; actually tested (§9.5), not assumed safe from Prisma's provider-agnostic syntax alone. |

### 9.3 Remaining, honestly-reported gaps

- **Rate limiting is in-memory and single-instance.** A horizontally-scaled deployment (multiple server processes/containers) would need a shared store (e.g. Redis) — documented in code and here, not silently assumed away.
- **No production deployment/CI pipeline** (§2.4) — out of scope for this phase.
- **NASA POWER historical-climate calls are not cached in a dedicated time-series table.** Acceptable at current call volume (feeds the yield model and the on-demand irrigation panel); would need a real table if usage grows significantly (`MODEL_CARD.md`, `src/lib/nasaPower.ts`).

### 9.4 Rate limiting, verified live

Hammering `/api/auth/login` with invalid credentials shows the exact expected cutover: the first several attempts (shared with any prior `/api/auth/register` calls from the same IP, since both endpoints share one combined budget by design) return `401 Invalid credentials`, and once the 10-request/minute budget is exhausted, every subsequent attempt returns `429` with a `Retry-After` header — confirmed by direct testing, not only by reading the rate-limiter's code.

### 9.5 PostgreSQL support, actually tested

`prisma/schema.prisma` (SQLite) remains the single authored source of truth; `scripts/generate-postgres-schema.mjs` mechanically derives `prisma/schema.postgres.prisma` (swapping the datasource provider and generator output path) so the two can never silently drift apart. Each engine gets its **own generated Prisma Client and its own migration history** (`prisma/migrations` vs. `prisma/migrations-postgres`) — necessary, not a workaround: inspecting the generated client confirmed Prisma bakes the active provider in at `generate` time, so one client cannot serve both dialects, and inspecting the two engines' actual migration SQL confirmed a real difference (SQLite stores enums as plain `TEXT`; PostgreSQL uses a native `CREATE TYPE ... AS ENUM`).

This was **actually tested**, not just wired: a dedicated PostgreSQL 16 container was run, the full migration history applied to it, the entire 68-test Vitest suite run against it (all passing), and the real Next.js dev server booted against it for a live register/login/session smoke test — not merely assumed to work because Prisma's schema syntax is provider-agnostic.

---

## 10. Testing and Evaluation

### 10.1 Automated test suite (new this phase)

Vitest, following the official Next.js 16 testing guide. **68 tests across 8 files**, run against a real, disposable SQLite database created fresh per run (actual Prisma + actual migrations, not a mocked query layer) and, separately, against a real PostgreSQL instance (§9.5). `next/headers`'s `cookies()` (only valid inside Next's real request-scoped context) is replaced with a real in-memory cookie jar for tests that exercise Route Handlers directly.

Coverage includes: registration/login/suspended-account rejection at login and mid-session, the rate limiter's bucket logic, the full booking lifecycle (create → owner-approve, conflict-safe double-approve rejection, auto-rejection of overlapping pending bookings, ownership guards, cancel-lifecycle rules, the review-eligibility gate), the weather/soil cache-and-fallback contract (mocked `fetch`, not real network calls, for determinism), the FAO-56 irrigation math, and — critically — **exact numerical parity** between each trained model's original Python output and its hand-written TypeScript port (`tests/gbm-parity.test.ts`, `tests/equipment-classifier-parity.test.ts`), using real held-out test rows and scikit-learn's own predictions as the ground truth, not a hand-derived expected value.

### 10.2 Two real, representative non-ML bugs found this way (earlier phases)

- **A timezone bug in the calendar view.** `CalendarView.tsx`'s date-key function forced a UTC conversion that could shift the resulting date by one day depending on the viewer's UTC offset. Root-caused by tracing the exact conversion mechanics, not by pattern-matching.
- **A pinned-scroll-sequence text-ghosting bug** on the marketing landing page, diagnosed to the crossfade's timeline design (§10.3).

### 10.3 Case study: diagnosing the pinned-sequence crossfade defect

The landing page's story section originally crossfaded adjacent panels by starting both the outgoing fade-out and the incoming fade-in at the same timeline position, for the same duration — a wide window where both panels sat at simultaneous partial opacity, reading as overlapping, both-legible text (photographic content would have shown this as a soft blend instead). Fixed by making the handoff sequential; verified with a script that stepped through the entire scroll range at fully-settled positions and confirmed, via both computed opacity values and screenshots, that at every sampled position exactly one panel is ever visible.

### 10.4 A real bug caught by the ML parity tests (this phase)

Described fully in §8.2 and `MODEL_CARD.md` §1.4: rounding exported gradient-boosted-tree split thresholds to 6 decimal places flipped a branch decision on 1 of 20 real held-out test rows, silently producing a materially different prediction. This was not caught by "does it run" or "does it look plausible" checks — it was caught specifically because the parity test compared the TypeScript port's output against scikit-learn's own prediction on the exact same input, row by row, and one row didn't match. Fixed by exporting full floating-point precision.

### 10.5 Live, real-internet verification (this phase's standard of evidence)

Beyond automated tests, every new external-data or ML feature was verified by actually registering a test user, creating a real farm at genuine coordinates, and calling the real endpoint over the actual internet — not only asserting against a mock:

- Real Open-Meteo weather and real SoilGrids soil data returned correctly for real Moroccan farmland coordinates (and a real, reproducible SoilGrids "no data" case was found near a coastal coordinate and handled explicitly, not silently).
- The real trained yield model returned a live, climate-fed prediction (`modelBacked: true`) for both a wheat field and an olive field.
- The real equipment classifier correctly recommended a tractor (not a harvester) for an olive-harvest task, live, at 58% confidence.
- The real demand-forecast endpoint returned both the field-specific hours forecast and the new platform seasonal-trend signal, live.
- The real chat assistant correctly answered live weather and soil questions, and correctly said so when live weather data was unavailable, live.
- The real irrigation endpoint returned a genuine, internally-consistent estimate (NASA POWER + FAO-56 Hargreaves + SoilGrids) for a real field, live.
- The real rate limiter cut off after the configured threshold against the real running dev server (§9.4).
- The real Next.js dev server booted and served real requests against a real PostgreSQL instance, not just against SQLite (§9.5).

### 10.6 What is still not covered

There is no CI pipeline running these tests automatically on every change (§2.4, §9.3) — they are run manually before considering a phase complete. This is an honest, explicitly flagged gap, not glossed over.

---

## 11. Results

### 11.1 Quantitative snapshot (measured directly from the repository)

| Metric | Value |
|---|---|
| TypeScript/TSX source files (excluding generated Prisma clients) | 319 |
| Total lines of source code (excluding generated Prisma clients) | ~15,776 |
| API route handler files | 50 |
| Page routes (`page.tsx`) | 30 |
| Prisma models | 17 |
| Prisma enums | 16 |
| SQLite migrations applied | 7 |
| PostgreSQL migrations applied (separate history, §9.5) | 2 |
| Automated test files | 8 |
| Automated tests (passing on both SQLite and Postgres) | 68 |
| Python ML training/data-generation scripts | 5 |
| Real training rows (yield model, from FAOSTAT + NASA POWER) | 1,892 |
| Synthetic training rows (equipment recommendation) | 800 |
| Synthetic training rows (demand forecast, 5 years) | ~1,560 |

### 11.2 Feature completion matrix

| Feature | Status |
|---|---|
| Auth (register/login/logout, RBAC) | ✅ Complete |
| Marketplace browse + booking request | ✅ Complete |
| Booking lifecycle incl. conflict-safe approve/reject | ✅ Complete, automated-test-covered |
| Reviews / Maintenance / Crop-cycle history / Notifications | ✅ Complete |
| Farms & Fields / Workers / Tasks / Calendar | ✅ Complete |
| Owner console / Admin console / Onboarding | ✅ Complete |
| Live weather (Open-Meteo) + soil (SoilGrids) integration | ✅ Complete, live-verified |
| Historical climate integration (NASA POWER) | ✅ Complete, live-verified |
| Irrigation recommendation (FAO-56) | ✅ Complete, live-verified |
| Yield prediction — trained model (FAOSTAT + NASA POWER) | ✅ Complete, live-verified, honestly-evaluated (R² 0.33–0.66) |
| Equipment recommendation — trained classifier + fallback | ✅ Complete, live-verified, honestly-evaluated (64.4% accuracy) |
| Demand forecast — trained seasonal signal | ✅ Complete, live-verified, honestly-evaluated (~parity with naive baseline) |
| Chat assistant grounded in live/trained data | ✅ Complete, live-verified |
| Automated test suite | ✅ Complete (68 tests, SQLite + Postgres) |
| Session revocation on suspension | ✅ Complete (immediate, not just at login) |
| Rate limiting | ✅ Complete, live-verified |
| Production secret management (`.env.example`, real `JWT_SECRET`, startup guard) | ✅ Complete |
| PostgreSQL support | ✅ Complete, tested end-to-end |
| Payment processing | ❌ Explicitly out of scope (§2.4) |
| Email/SMS delivery | ❌ Explicitly out of scope (§2.4) |
| Production deployment/CI pipeline | ❌ Explicitly out of scope (§2.4) |
| Full LLM-based assistant | ❌ Explicitly out of scope, stretch goal (§2.4) |

---

## 12. Discussion

### 12.1 What the project demonstrates

The core marketplace-plus-farm-management integration works end-to-end with real, non-trivial engineering in places that are easy to get subtly wrong: an atomic, race-condition-safe booking transition; a schema evolution verified safe against every real consumer before being made; a documented, intentional boundary on where expressive motion is and isn't appropriate; a hardened auth layer with immediate revocation and rate limiting, tested against two database engines; a real external-data pipeline with honest handling of upstream data gaps; and three trained ML models, each with its accuracy honestly measured and reported — including two genuine negative results (a weak linear yield model, a first-draft demand forecast that underperformed a naive baseline) that were diagnosed and fixed rather than hidden or glossed over.

### 12.2 Where the project is honest about its real limits

Not every trained model performs strongly, and this report says so plainly: the yield model's R² tops out around 0.66 and is as low as 0.33 for olives; the equipment classifier gets roughly two-thirds of held-out cases exactly right; the demand-forecast model, even after a real fix, is only roughly on par with a naive baseline. Each of these is explained with a concrete, defensible reason (limited climate-only predictive power across heterogeneous countries; deliberately overlapping synthetic classes; a small demand-amplitude-to-noise ratio) rather than asserted as simply "good enough." This is treated as more academically honest — and more useful to a reader trying to judge the actual state of the work — than reporting only favorable numbers.

---

## 13. Limitations and Future Work

In priority order, based on what would most change the system's real-world readiness:

1. **Per-region yield models.** The current yield model pools 17 countries into one training set per crop; a model trained on one region's own historical yields against its own climate would very likely fit far tighter than the current cross-country R² of 0.33–0.66 — a natural, high-value next step once more region-specific historical data is identified.
2. **A dedicated historical-climate cache/table.** NASA POWER calls for the yield model and irrigation panel are not currently cached in a table (unlike current weather and soil) — fine at today's call volume, worth revisiting if usage grows.
3. **Real booking-history-driven demand forecasting.** Once this platform has real usage history, retrain the demand-forecast model on that instead of synthetic data — real demand won't have an artificially-injected timing jitter, and the smoothing window can be tuned against real seasonal transition sharpness.
4. **A production deployment/CI pipeline**, so the existing automated test suite runs on every change rather than only manually before a phase is considered complete.
5. **Payment integration** (Stripe or similar), if the marketplace is ever intended to process real transactions.
6. **Email/SMS delivery** (SendGrid/Twilio or similar), for real-world time-sensitive notifications.
7. **A distributed rate-limit store** (e.g. Redis), if this is ever deployed across multiple server instances.
8. **A full LLM-based conversational assistant**, as a genuine stretch goal beyond the current keyword/intent-classification approach.

---

## 14. Conclusion

agriLease demonstrates a complete, working full-stack implementation of a dual-purpose agritech platform — an equipment rental marketplace and a farm management system — now extended with real external agronomic data (weather, historical climate, soil) and genuinely trained machine-learning models for yield prediction, equipment recommendation, and demand forecasting, each backed by a hand-written, parity-verified TypeScript inference engine requiring no Python runtime in production. The system's authentication and data layer are hardened (immediate session revocation, rate limiting, secret management, an automated test suite, and tested PostgreSQL support), closing every gap identified in this project's earlier phases. Two genuine negative results in the machine-learning work — a linear yield model that fit far worse than the served alternative, and a first-draft demand-forecast model that initially underperformed a naive baseline — were diagnosed and addressed rather than hidden, consistent with this project's consistent practice throughout of reporting what was actually measured rather than what would look best. The remaining gaps (payment processing, email/SMS delivery, a production deployment pipeline, per-region model refinement, and a full LLM-based assistant) are identified precisely and prioritized, giving a clear, credible, and honestly-scoped path from this working system toward a fully production-ready one.

---

## 15. References

*(Real, checkable technical references used while building the system. Add your own academic/scholarly citations per §3 before submission — do not present this list as a substitute for a literature review.)*

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
- Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). *Crop Evapotranspiration — Guidelines for Computing Crop Water Requirements.* FAO Irrigation and Drainage Paper 56. — source of the Hargreaves-Samani reference-evapotranspiration formula and crop coefficients used in §8.6.
- scikit-learn Documentation — https://scikit-learn.org/stable/
- OWASP — Session Management Cheat Sheet, Authentication Cheat Sheet — https://cheatsheetseries.owasp.org/
- Zod Documentation — https://zod.dev
- `jose` (JWT library) Documentation — https://github.com/panva/jose
- Vitest Documentation — https://vitest.dev

---

## 16. Appendices

### Appendix A — Full Prisma model list

`User`, `Farm`, `Field`, `Worker`, `Equipment`, `Task`, `EquipmentAlert`, `EquipmentTrackPoint`, `EquipmentPerformanceSample`, `Booking`, `Review`, `MaintenanceRecord`, `CropCycle`, `Notification`, `Crop`, `WeatherCache`, `SoilCache`.

### Appendix B — Full enum list

`Role`, `CropType`, `IrrigationType`, `WaterSource`, `SoilType`, `FieldStatus`, `EquipmentType`, `EquipmentStatus`, `TaskStatus`, `TaskPriority`, `WorkerStatus`, `AlertType`, `AlertSeverity`, `BookingStatus`, `PaymentStatus`, `NotificationType`.

### Appendix C — Route map (by role)

| Path prefix | Allowed roles |
|---|---|
| `/dashboard` | FARMER, ADMIN |
| `/equipment` | FARMER, EQUIPMENT_OWNER, ADMIN |
| `/ai` | FARMER, ADMIN |
| `/marketplace` | FARMER, ADMIN |
| `/rentals` | FARMER, ADMIN |
| `/owner` | EQUIPMENT_OWNER, ADMIN |
| `/admin` | ADMIN |
| `/onboarding` | FARMER, EQUIPMENT_OWNER |
| `/farms` | FARMER, ADMIN |
| `/workers` | FARMER, ADMIN |
| `/tasks` | FARMER, ADMIN |
| `/calendar` | FARMER, ADMIN |

### Appendix D — How to run the project locally

```bash
npm install
cp .env.example .env        # fill in a real JWT_SECRET (see the file for how to generate one)
npx prisma migrate deploy   # or: npx prisma migrate dev
npx tsx prisma/seed.ts      # seed demonstration data
npm run dev                 # http://localhost:3000
```

### Appendix E — How to run the tests

```bash
npm test                                              # SQLite, self-contained, ~10s
npx vitest run --config vitest.postgres.config.ts     # same suite against Postgres (needs a running instance)
```

### Appendix F — How to reproduce the trained models

See `MODEL_CARD.md` §5 for the exact commands. In summary:

```bash
python scripts/ml/build_yield_dataset.py       # real FAOSTAT + NASA POWER data
python scripts/ml/train_yield_model.py
python scripts/ml/generate_synthetic_data.py   # synthetic, clearly labeled
python scripts/ml/train_equipment_classifier.py
python scripts/ml/train_demand_forecast.py
```

Each script writes its served model directly into `src/lib/ai/*.json` and its metrics/parity fixtures into `scripts/ml/data/` (both committed to the repository).

### Appendix G — SQLite migration history

1. `20260703170406_init`
2. `20260704010319_add_equipment_listing_and_booking`
3. `20260704170513_add_user_suspension_and_equipment_flag`
4. `20260704215635_add_farm_field_extended_attributes`
5. `20260705162623_add_priority2_schema_reconciliation`
6. `20260710005422_add_worker_status_and_general_tasks`
7. `20260716001828_add_weather_forecast_fields`

### Appendix H — PostgreSQL migration history (separate, see §9.5)

1. `20260716000515_init`
2. `20260716001925_add_weather_forecast_fields`
