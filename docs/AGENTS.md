# AGENTS.md — Instructions for AI Coding Agents

**Project:** Regreso Seguro  
**Version:** 1.0  
**Last updated:** 2026-09-25  

This file is the mandatory entry point for any AI coding agent (Cursor, Codex, IBM Bob, GitHub Copilot Workspace, etc.) working on this codebase. Read this file completely before doing anything else.

---

## What This Project Does

Regreso Seguro is a **Progressive Web App (PWA)** that enables people who have consumed alcohol to return home safely **along with their own car**. A professional driver is dispatched to the user's location, drives the user's car home, and the user travels in their own vehicle.

The MVP covers:
- Rider request flow (location, vehicle, price estimate, submission)
- Manual driver assignment by an operator
- Real-time status tracking
- Driver interface (availability, GPS, status advancement)
- Admin panel (request management, driver management, pricing config, analytics)
- Post-service mutual rating
- Push notifications and transactional email

---

## Authoritative Specification Documents

Before changing any behavior, read the relevant documents from the `/docs` folder:

| Document | What it contains | When to read it |
|---|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product vision, MVP scope, success metrics, constraints | Before any feature work |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Formal functional requirements (FR-001 to FR-025) with acceptance criteria | Before implementing any feature |
| [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) | Business rules (BR-001 to BR-029) — explicit, testable | Before any logic involving prices, strikes, status transitions, roles |
| [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) | UX behavior: all states, error states, empty states, navigation | Before building any UI screen |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, routing, auth, deployment, security | Before any structural change |
| [`docs/ADR.md`](docs/ADR.md) | Architecture Decision Records — why each major decision was made | Before proposing a new architecture approach |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Database schema, RLS policies, enums, relationships | Before any DB change |
| [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) | Test cases per requirement, traceability matrix | Before writing or running tests |
| [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) | Task list with dependencies, DoD, and implementation order | Before starting any task |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | All product and technology decisions | When something seems unclear or contradictory |
| [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) | Unresolved questions that block implementation | Before implementing affected features |
| [`docs/MVP_CHECKLIST.md`](docs/MVP_CHECKLIST.md) | Launch readiness checklist | Before declaring the MVP complete |

---

## Before Implementing a Task

1. Read the task definition in `docs/IMPLEMENTATION_PLAN.md`
2. Read all referenced requirements in `docs/REQUIREMENTS.md`
3. Read all referenced business rules in `docs/BUSINESS_RULES.md`
4. Read the relevant user flows in `docs/USER_FLOWS.md`
5. Read any referenced ADRs in `docs/ADR.md`
6. Check `docs/OPEN_QUESTIONS.md` — if an open question affects this task, **stop and report it before proceeding**
7. Inspect the existing codebase for relevant patterns (do not invent new patterns)
8. Implement only what is required by the task — do not expand scope

---

## What Agents Are Forbidden From Inventing

Never invent or assume:

- **Product behavior** — every behavior must be traceable to a requirement (FR-XXX) or business rule (BR-XXX)
- **Data model changes** — do not add, remove, or rename columns without a documented reason
- **New external services** — all integrations are defined; do not add new APIs or SDKs without a decision
- **New admin roles or permissions** — roles are defined in BR-028 and ADR-009
- **Payment logic** — payments are explicitly out of scope for MVP (see PRD.md §6)
- **Automated driver matching** — explicitly out of scope for MVP
- **Real-time GPS tracking on map** — explicitly out of scope for MVP
- **Pricing models** — the 3-component distance-based model is fixed (BR-012); do not change it
- **Status transitions** — defined in BR-014 and BR-015; do not add or modify them

---

## How to Handle Ambiguity

If you encounter something that is unclear, undefined, or conflicting:

1. Check `docs/OPEN_QUESTIONS.md` — it may already be documented
2. Check `docs/DECISIONS.md` — it may already be resolved
3. Check `docs/REQUIREMENTS.md` and `docs/BUSINESS_RULES.md` for the relevant sections

If after checking all documents the question is still unresolved:

**STOP. Do not guess.**

Report the ambiguity with:
- The specific question
- What you need to know
- What the options are
- Which task / requirement is blocked

Add it to `docs/OPEN_QUESTIONS.md` before asking the user.

---

## Architectural Constraints

Do not violate these constraints without a new approved ADR:

| Constraint | Why |
|---|---|
| All external services must be free | TD-001 (hard constraint) |
| No separate backend process | ADR-002: Next.js API routes handle all server logic |
| Supabase Auth for authentication | ADR-003: no other auth provider |
| JWT in httpOnly cookies only | ARCHITECTURE.md §7 |
| All API keys server-side only | ARCHITECTURE.md §7 |
| RLS on all Supabase tables | ADR-003; mandatory for security |
| Zod validation on all API route inputs | ARCHITECTURE.md §7 |
| No raw exceptions surfaced to the client | ARCHITECTURE.md §8 |
| TypeScript throughout — no plain `.js` files | ADR-004 |
| Tailwind CSS for styling — no CSS-in-JS | ADR-006 |
| OpenRouteService for routing and distance | ADR-005 |

---

## Important Coding Conventions

### Project Structure (Next.js App Router)

```
app/
  (rider)/          — rider-facing pages
  (driver)/         — driver-facing pages  
  (admin)/          — admin panel pages
  api/              — API routes (server-side only)
  auth/             — login / register pages
lib/
  pricing/          — price calculation logic (pure functions)
  services/         — status transition logic (pure functions)
  strikes/          — strike logic (pure functions)
  ratings/          — rating validation (pure functions)
  supabase/         — Supabase client helpers
  resend/           — email sending utilities
  push/             — Web Push utilities
components/         — shared UI components
supabase/
  migrations/       — all DB migrations
types/              — auto-generated Supabase types + custom types
```

### Key Patterns

- **Business logic lives in `lib/`** as pure TypeScript functions, not inside API routes or components
- **API routes** call `lib/` functions and handle HTTP concerns (auth check, input validation with Zod, response formatting)
- **Components** contain only UI + UX logic — no business logic, no direct Supabase calls except for Realtime subscriptions
- **Supabase service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is used only in API routes for operations that bypass RLS — never in the client

### Environment Variable Naming

| Prefix | Visibility |
|---|---|
| `NEXT_PUBLIC_` | Client-accessible (safe to expose) |
| (no prefix) | Server-side only |

Never move a secret to a `NEXT_PUBLIC_` variable.

---

## How to Run Tests

```bash
# Unit and integration tests
npm run test

# Watch mode
npm run test:watch

# End-to-end tests (requires running app + Supabase)
npm run e2e

# Type check
npm run typecheck

# Lint
npm run lint
```

Tests must pass before committing. Do not commit if unit or integration tests fail.

---

## Definition of Done (for any task)

A task is complete when:

- [ ] All acceptance criteria in `docs/REQUIREMENTS.md` for the covered requirements are met
- [ ] All business rules in `docs/BUSINESS_RULES.md` for the affected area are enforced
- [ ] Unit tests pass for all new pure logic
- [ ] Integration tests pass for all new API routes
- [ ] TypeScript compiles with no errors (`npm run typecheck`)
- [ ] Lint passes with no new warnings (`npm run lint`)
- [ ] The relevant task in `docs/IMPLEMENTATION_PLAN.md` has its DoD items checked
- [ ] No new secrets are in the codebase or committed to git
- [ ] No out-of-scope features were added

---

## How to Update Project Documentation

When a decision changes or a new requirement is confirmed:

1. Update the relevant document (`REQUIREMENTS.md`, `BUSINESS_RULES.md`, etc.)
2. Add an entry to `DECISIONS.md` noting what changed, why, and what it affects
3. If an open question was resolved, move it from "Open" to the "Resolved" section in `OPEN_QUESTIONS.md`
4. If requirements changed, update `TEST_PLAN.md` traceability
5. If implementation tasks are affected, update `IMPLEMENTATION_PLAN.md`

**Never silently overwrite a previous decision.** Always record what changed and why.

---

## Out-of-Scope Features (do not implement)

These are explicitly excluded from the MVP. Do not implement, scaffold, or stub them:

- Integrated payments (Mercado Pago, Stripe, etc.)
- Automated driver matching or routing optimization
- Real-time GPS tracking displayed on a map
- Strike monetary penalties
- Loyalty programs, promotions, discount codes
- Multiple service types
- Driver ratings visible to other riders (ratings are internal to operations for MVP)
- Push notifications via Firebase Cloud Messaging
- Native iOS or Android apps
