# DECISIONS — Regreso Seguro

**Version:** 1.1
**Last updated:** 2026-09-25

This file is the authoritative log of every significant decision made during the project.  
It is organized by category. All decisions are traceable to their source.

---

## Product Decisions

| ID | Decision | Source | Date | Status |
|---|---|---|---|---|
| PD-001 | Deploy as PWA (not native iOS/Android) | README D-001 | 2026-09-16 | Accepted |
| PD-002 | User authentication via email + password | Interview Q4 | 2026-09-25 | Accepted |
| PD-003 | Drivers have their own in-app interface (role-based view) | Interview Q2 | 2026-09-25 | Accepted |
| PD-004 | Payments are out of scope for MVP; show estimated price only; collect cash manually | Interview Q3 | 2026-09-25 | Accepted |
| PD-005 | Admin assigns drivers from a pre-registered driver list | Interview Q4 | 2026-09-25 | Accepted |
| PD-006 | Push notifications via PWA Web Push API | Interview Q5 | 2026-09-25 | Accepted |
| PD-007 | Free cancellation while status = Requested; post-assignment cancellation = 1 strike; 3 strikes = suspension | Interview Q6 | 2026-09-25 | Accepted |
| PD-008 | Strikes will carry a monetary cost post-MVP when payment integration ships | Interview Q6 | 2026-09-25 | Post-MVP documented |
| PD-009 | Lazy auth gate: browse freely, login required only to submit request | Interview Q7 | 2026-09-25 | Accepted |
| PD-010 | MVP covers CABA + AMBA (GBA) from day one | Interview Q8 | 2026-09-25 | Accepted |
| PD-011 | Pricing: 3-component distance-based (driver→pickup, pickup→destination, destination→driver) | Interview Q9 | 2026-09-25 | Accepted |
| PD-012 | Driver GPS captured via device GPS when driver is online | Interview Q10 | 2026-09-25 | Accepted |
| PD-013 | Preliminary price estimate shown at request time (nearest driver); final price after assignment | Interview Q11 | 2026-09-25 | Accepted |
| PD-014 | Driver profile fields: name, DNI, phone, license number, license category, availability, GPS, rating | Interview Q12 | 2026-09-25 | Accepted |
| PD-015 | Post-service mutual rating (rider rates driver; driver rates rider); in-app after completion | Interview Q13 | 2026-09-25 | Accepted |
| PD-016 | Two admin roles: Operator (assign + manage requests) and Super-Admin (full access) | Interview Q14 | 2026-09-25 | Accepted |
| PD-017 | Vehicles: riders save vehicles to profile; offered at request time; can create new | Interview Q23 | 2026-09-25 | Accepted |
| PD-018 | Service history included in MVP | Interview Q24 | 2026-09-25 | Accepted |
| PD-019 | Preliminary price estimate uses nearest online driver's GPS location | Interview Q25 | 2026-09-25 | Accepted |
| PD-020 | No drivers online → block request with message "No hay conductores disponibles" | OQ-001 | 2026-09-25 | Accepted |
| PD-021 | Stale driver GPS at assignment → warn operator; allow 60s to refresh; log if proceeds. Staleness threshold: 5 minutes | OQ-002 | 2026-09-25 | Accepted |
| PD-022 | Driver onboarding: self-register via /driver/register; Super-Admin promotes + fills driver profile | OQ-003 | 2026-09-25 | Accepted |
| PD-023 | Operator-initiated cancellation from Assigned → no strike; apology to rider; pre-fill re-request | OQ-004 | 2026-09-25 | Accepted |
| PD-024 | Price display format: $1.500,00 (es-AR locale via Intl.NumberFormat) | OQ-005 | 2026-09-25 | Accepted |
| PD-025 | No rating on cancelled services; rating only on Completed | OQ-006 | 2026-09-25 | Accepted |

---

## Technology Decisions

| ID | Decision | Source | Date | Status |
|---|---|---|---|---|
| TD-001 | All external services must be free/open-source; no paid APIs | Interview (zero-cost constraint) | 2026-09-25 | Accepted — Hard Constraint |
| TD-002 | Next.js 14+ (App Router) as full-stack framework | Interview Q16+Q21 + ADR-002 | 2026-09-25 | Accepted |
| TD-003 | TypeScript throughout | ADR-004 | 2026-09-25 | Accepted |
| TD-004 | Supabase for DB (PostgreSQL), Auth, Realtime, Storage | Interview Q15 + ADR-003 | 2026-09-25 | Accepted |
| TD-005 | Vercel free tier for deployment | Interview Q21 | 2026-09-25 | Accepted |
| TD-006 | Tailwind CSS for styling | ADR-006 | 2026-09-25 | Accepted |
| TD-007 | OpenRouteService (free tier) for routing and distance | Interview Q20 + ADR-005 | 2026-09-25 | Accepted |
| TD-008 | Leaflet.js + OpenStreetMap for maps | ADR-005 | 2026-09-25 | Accepted |
| TD-009 | Resend free tier for transactional email | Interview Q19 + ADR-007 | 2026-09-25 | Accepted |
| TD-010 | Web Push API with VAPID keys for push notifications | ADR-008 | 2026-09-25 | Accepted |
| TD-011 | Supabase Realtime for live status updates | Interview Q22 | 2026-09-25 | Accepted |
| TD-012 | Zod for API input validation | ARCHITECTURE.md | 2026-09-25 | Accepted |
| TD-013 | Row Level Security (RLS) on all Supabase tables | ARCHITECTURE.md + ADR-003 | 2026-09-25 | Accepted |
| TD-014 | Vitest for unit and integration tests | TEST_PLAN.md | 2026-09-25 | Accepted |
| TD-015 | Playwright for end-to-end tests | TEST_PLAN.md | 2026-09-25 | Accepted |

---

## Architecture Decisions

All architecture decisions are documented in detail in [`docs/ADR.md`](ADR.md).

| ADR | Summary |
|---|---|
| ADR-001 | PWA over native apps |
| ADR-002 | Next.js as full-stack framework on Vercel |
| ADR-003 | Supabase as backend-as-a-service |
| ADR-004 | TypeScript throughout |
| ADR-005 | OpenRouteService for routing |
| ADR-006 | Tailwind CSS |
| ADR-007 | Resend for email |
| ADR-008 | Web Push API for notifications |
| ADR-009 | Two admin roles |

---

## Explicitly Rejected Alternatives

| Alternative | Reason rejected | Preferred decision |
|---|---|---|
| Native iOS/Android apps | Too costly for MVP; 5-person academic team | PWA (PD-001) |
| Google Maps API | Paid beyond free tier; violates zero-cost constraint | OpenRouteService + Leaflet/OSM (TD-007, TD-008) |
| Mapbox | Paid beyond free tier | OpenRouteService (TD-007) |
| OSRM (self-hosted) | Requires VPS + Argentina OSM data processing; too complex for MVP | OpenRouteService (TD-007) |
| Firebase | Firestore is non-relational; more complex real-time patterns; no net benefit over Supabase | Supabase (TD-004) |
| Separate frontend + backend repos | Doubles deployment complexity; no benefit at MVP scale | Next.js monorepo (TD-002) |
| Single admin role | Violates least-privilege; all admins could change pricing | Two admin roles (PD-016) |
| Full RBAC system | Over-engineered for 5-person team and 4-role MVP | Two admin roles (PD-016) |
| Guest requests (no account needed) | Identified as a product risk: no way to enforce strike system | Lazy auth gate (PD-009) |
| Cash pricing only (no estimate shown) | Poor UX; riders need to know cost upfront | Show estimated price (PD-004) |
| Only ride leg cost in estimate | Misleading — hides real total cost from rider | 3-component estimate (PD-013, PD-019) |

---

## Post-MVP Decisions Documented

These decisions are not in scope for MVP but have been explicitly discussed and recorded to avoid re-litigating them.

| Decision | Expected trigger |
|---|---|
| Strike monetary penalty | When Mercado Pago / payment integration ships |
| Integrated payments (Mercado Pago) | Post-MVP launch and validation |
| Automated driver matching | After manual operations prove the model |
| Real-time GPS tracking on map | After MVP validation |
| Native iOS/Android apps | After MVP validation and user demand confirmed |
