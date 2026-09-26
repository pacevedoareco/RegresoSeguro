# OPEN_QUESTIONS — Regreso Seguro

**Version:** 1.2
**Last updated:** 2026-09-25

This file tracks all unresolved questions. Every entry must be resolved before the feature that depends on it can be implemented.

---

## Format

| Field | Description |
|---|---|
| **ID** | Unique identifier |
| **Question** | The specific unresolved question |
| **Context** | Why this matters / what breaks without an answer |
| **Impact** | Which requirements/tasks are blocked |
| **Status** | Open / Resolved / Deferred |
| **Owner** | Who should answer this |

---

## OQ-001 — No Drivers Online at Request Time

**Status:** Resolved — 2026-09-25
**Owner:** PM (Ignacio Caprara)

**Resolution:**
Block the request. Show the message: *"No hay conductores disponibles en este momento. Intentá de nuevo más tarde."* The rider cannot submit the request until at least one driver is online. No estimate is shown.

**Impact on spec:**
- FR-008 AC-008-4 is now: "When no driver is online, the system blocks the request and displays the unavailability message."
- TASK-005 must implement the block at the request review step.

---

## OQ-002 — Stale Driver GPS at Assignment Time

**Status:** Resolved — 2026-09-25
**Owner:** Pablo Acevedo Areco (Architect)

**Resolution:**
Warn the operator that the driver's GPS location may be outdated. Allow the operator up to 1 minute to wait for a fresh GPS update from the driver before proceeding. If the operator proceeds anyway, use the stored (stale) location and log a warning.

**Staleness threshold:** 5 minutes. **Confirmed Decision** (approved 2026-09-25).

**Impact on spec:**
- TASK-008 must show a warning banner when `driver_profiles.location_updated_at` is older than the threshold.
- The operator has a "Refresh" action that waits up to 60 seconds for a new GPS ping from the driver.
- If the operator proceeds with stale GPS, this is logged in `service_status_log` as a note.

---

## OQ-003 — How Drivers Are Initially Registered / Onboarded

**Status:** Resolved — 2026-09-25
**Owner:** PM (Ignacio Caprara)

**Resolution:**
Drivers self-register through the driver app (a dedicated registration entry point at `/driver/register`). They create an account with email + password like a rider. Their role defaults to `rider` until a Super-Admin promotes them to `driver` via the admin panel and fills in their driver profile details (DNI, license, etc.).

Until promoted, the driver cannot access the driver interface (role check blocks `/driver/*` routes).

**Impact on spec:**
- TASK-002 (auth): `/driver/register` may share the same registration flow as riders; role defaults to `rider`.
- TASK-011: Super-Admin sees a list of accounts pending promotion; can promote and fill driver profile.
- FR-023 AC-023-1 updated: "Super-Admin promotes an existing registered user to driver and fills in required driver profile fields."
- A new admin view is needed: "Pending driver applications" — users who registered via `/driver/register` but have not yet been promoted.

---

## OQ-004 — Operator-Initiated Cancellation Strike Rule

**Status:** Resolved — 2026-09-25
**Owner:** PM (Ignacio Caprara)

**Resolution:**
No strike. When an operator cancels a service from "Assigned" status, the rider receives **no strike**. The app apologizes to the rider ("Lo sentimos, el servicio fue cancelado. Podés solicitar uno nuevo.") and the request form is pre-filled with the same pickup, destination, and vehicle so the rider can re-request with one tap.

**Impact on spec:**
- BR-003 remains unchanged (strike only applies to rider-initiated cancellations from Assigned).
- TASK-008: Operator cancel from Assigned must NOT add a strike; must send an apology notification to the rider with a "Request again" deep link.
- TASK-006: Rider status screen shows the apology message and a "Request again" CTA that pre-fills the previous ride data.
- New business rule to add: BR-030 (see BUSINESS_RULES.md update needed).

---

## OQ-005 — Price Display Currency and Formatting

**Status:** Resolved — 2026-09-25
**Owner:** PM / UX (Jordan Calle Gutierrez)

**Resolution:**
Use Argentine local format: **`$1.500,00`** — period as thousands separator, comma as decimal separator, `$` prefix (no space).

**Implementation note:** Use `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })` in JavaScript/TypeScript. This produces the correct format natively without a custom formatter.

**Impact on spec:**
- All price displays throughout the app use `es-AR` locale currency formatting.
- Admin pricing config input field accepts numbers; display uses the same format.
- `numeric(10,2)` DB columns accommodate large ARS values (up to 99,999,999.99 — sufficient even at high inflation).

---

## OQ-006 — What Happens to Rating After Service Cancellation

**Status:** Resolved — 2026-09-25
**Owner:** PM (Ignacio Caprara)

**Resolution:**
No rating on cancelled services, regardless of who cancelled or at what stage.

**Impact on spec:**
- FR-018 and BR-024 confirmed: rating only applies to services with status `completed`.
- TASK-009: rating prompt must check `status = 'completed'` before appearing; no rating path for `cancelled` services.

---

---

## Resolved Questions (archive)

| ID | Question | Resolution | Date |
|---|---|---|---|
| — | Auth mechanism | Email + password via Supabase Auth | 2026-09-25 |
| — | Driver interface | In-app driver role view | 2026-09-25 |
| — | Payment in MVP | No payment integration; show estimated price; cash | 2026-09-25 |
| — | Push notification mechanism | Web Push API / PWA | 2026-09-25 |
| — | Cancellation rules | Free from Requested; strike from Assigned; 3 strikes = suspension | 2026-09-25 |
| — | Geographic scope | CABA + AMBA from day 1 | 2026-09-25 |
| — | Pricing model | 3-component distance-based | 2026-09-25 |
| — | Driver GPS | Real-time device GPS | 2026-09-25 |
| — | Preliminary vs final price | Both (nearest driver estimate + assigned driver final) | 2026-09-25 |
| — | Driver profile fields | Confirmed fields list | 2026-09-25 |
| — | Post-service rating | Mutual, in-app, 1–5 stars | 2026-09-25 |
| — | Admin roles | Operator + Super-Admin | 2026-09-25 |
| — | Vehicle model | Save to profile; offer at request; create if none | 2026-09-25 |
| — | Service history | Included in MVP | 2026-09-25 |
| — | Routing provider | OpenRouteService free tier | 2026-09-25 |
| — | Tech stack | Next.js, Supabase, Vercel, Tailwind, TypeScript | 2026-09-25 |
