# IMPLEMENTATION_PLAN — Regreso Seguro

**Version:** 1.1
**Status:** In Progress
**Last updated:** 2026-09-26

---

## Task Status Dashboard

| Task | Title | Status |
|---|---|---|
| TASK-001 | Project Foundation & Supabase Setup | ✅ Completed |
| TASK-002 | Authentication (Registration & Login) | ✅ Completed |
| TASK-003 | Database Schema: Supabase Migrations | ✅ Completed |
| TASK-004 | Vehicle Management | ✅ Completed |
| TASK-005 | Service Request Flow (Rider) | ✅ Completed |
| TASK-006 | Real-time Status Tracking (Rider) | ✅ Completed |
| TASK-007 | Driver Interface | ✅ Completed |
| TASK-008 | Admin Panel: Operator Functions | ✅ Completed |
| TASK-009 | Mutual Rating | ✅ Completed |
| TASK-010 | Push Notifications | ⏳ Pending |
| TASK-011 | Super-Admin: Driver Management & Pricing | ⏳ Pending |
| TASK-012 | Service History & Rider Profile | ⏳ Pending |
| TASK-013 | Analytics Dashboard (Super-Admin) | ⏳ Pending |
| TASK-014 | Email Notifications | ⏳ Pending |
| TASK-015 | PWA Hardening & Production Readiness | ⏳ Pending |

---

## Principles

- Tasks are vertical slices — each delivers working, testable functionality
- Tasks are ordered by dependency (foundation first, features second)
- No task should block another task unnecessarily
- Each task has a clear Definition of Done (DoD)
- No task implements features outside MVP scope

---

## TASK-001 — Project Foundation & Supabase Setup

**Objective:** Bootstrap the Next.js project, connect Supabase, configure environment, and verify local development works end-to-end.

**Requirements covered:** All (foundational — nothing works without this)  
**Architecture components:** Next.js, Supabase, Vercel, environment variables

**Dependencies:** None

**Implementation steps:**
1. Initialize Next.js 14+ project with TypeScript and App Router
2. Install and configure Tailwind CSS
3. Install `@supabase/ssr`, `@supabase/supabase-js`
4. Create `.env.local` with all required environment variables (see ARCHITECTURE.md §10)
5. Configure Supabase local development with `supabase init` and `supabase start`
6. Write and apply initial database migration: all tables, enums, indexes, RLS policies (from DATA_MODEL.md)
7. Generate TypeScript types from Supabase schema (`supabase gen types`)
8. Configure Next.js middleware for auth session refresh
9. Create `.env.example` with all keys (values redacted)
10. Connect GitHub repository to Vercel; verify CI/CD pipeline deploys on push to `main`
11. Configure `next-pwa` for basic PWA manifest and service worker

**Tests required:**
- `supabase db push` applies migrations without errors
- App builds and runs locally (`npm run dev`)
- Vercel preview deployment succeeds
- Supabase Realtime connection can be established from local app

**Definition of Done:**
- [ ] Next.js app runs locally at `localhost:3000`
- [ ] Supabase local instance running with all tables created
- [ ] TypeScript types generated from DB schema
- [ ] Vercel auto-deploy on push to `main` is working
- [ ] PWA manifest visible at `/manifest.json`
- [ ] `.env.example` committed; `.env.local` in `.gitignore`

---

## TASK-002 — Authentication (Registration & Login)

**Objective:** Implement email + password registration and login using Supabase Auth; create user profile on registration.

**Requirements covered:** FR-001, FR-002, FR-003, FR-004  
**Architecture components:** Supabase Auth, `@supabase/ssr`, Next.js middleware, profiles table

**Dependencies:** TASK-001

**Implementation steps:**
1. Create `/auth/register` page with email + password form
2. Create `/auth/login` page with email + password form
3. Implement Supabase Auth registration call; handle errors (duplicate email, weak password)
4. Create a Supabase DB trigger: `on auth.users insert → create profiles row` (role = rider by default)
5. Implement Supabase Auth login; handle errors
6. Update Next.js middleware to protect `/driver/*` and `/admin/*` routes by role
7. Implement lazy auth gate: interceptor on request submission that redirects to login and returns user to flow
8. Implement account suspension check: FR-004 (suspended users see block message on request attempt)
9. Implement logout
10. Send registration confirmation email via Resend (from API route, not client)

**Tests required:**
- IT-001-1 to IT-001-4
- IT-002-3 (suspended rider blocked)
- E2E-001 steps 3–4

**Definition of Done:**
- [ ] User can register with valid email and password
- [ ] Duplicate email returns clear error
- [ ] Confirmation email received via Resend
- [ ] User can log in; session persisted across page refresh
- [ ] Invalid credentials show generic error
- [ ] Suspended user sees suspension message when attempting to request
- [ ] `/driver/*` and `/admin/*` reject unauthorized roles

---

## TASK-003 — Database Schema: Supabase Migrations

**Objective:** Write and verify all production database migrations (tables, enums, indexes, RLS policies, triggers).

**Requirements covered:** All data-dependent requirements  
**Architecture components:** Supabase PostgreSQL, RLS, triggers

**Dependencies:** TASK-001

**Note:** TASK-002 needs the `profiles` table. TASK-001 bootstraps the schema. This task documents the complete migration as a separate tracked deliverable to ensure all entities are correct before feature work begins.

**Implementation steps:**
1. Write migration for all enums (`user_role`, `driver_availability`, `service_status`)
2. Write migration for `profiles` table with trigger to auto-create on auth signup
3. Write migration for `driver_profiles` table
4. Write migration for `vehicles` table
5. Write migration for `services` table with all columns
6. Write migration for `service_status_log` table
7. Write migration for `ratings` table with trigger to update `profiles.average_rating`
8. Write migration for `pricing_config` table with seed row (initial per-km rate = 1 ARS, to be updated by admin)
9. Write migration for `push_subscriptions` table
10. Write all RLS policies (see DATA_MODEL.md §RLS Policy Summary)
11. Write all key indexes
12. Write trigger: on `profiles.strikes` update, set `is_suspended = true` if `strikes >= 3`

**Tests required:**
- `supabase db reset` then `supabase db push` runs without errors
- TypeScript types re-generated and all match expected schema

**Definition of Done:**
- [ ] All migrations applied cleanly to local Supabase instance
- [ ] TypeScript types match all table definitions
- [ ] RLS policies confirmed via Supabase dashboard policy viewer
- [ ] `pricing_config` seeded with one row

---

## TASK-004 — Vehicle Management

**Objective:** Allow riders to save vehicles to their profile and select/create them during the request flow.

**Requirements covered:** FR-005, FR-006  
**Architecture components:** `vehicles` table, API routes, React components

**Dependencies:** TASK-002, TASK-003

**Implementation steps:**
1. Create API route `POST /api/vehicles` — save a new vehicle
2. Create API route `GET /api/vehicles` — list rider's saved vehicles
3. Create API route `DELETE /api/vehicles/[id]` — soft delete a vehicle
4. Create `VehicleSelector` component: shows saved vehicles, option to add new
5. Create `VehicleForm` component: license plate, make/model, color fields
6. Integrate into rider profile page: view and manage saved vehicles
7. Integrate `VehicleSelector` into the service request flow (TASK-005 will use it)

**Tests required:**
- IT-007-1 to IT-007-4
- UT validation on vehicle fields

**Definition of Done:**
- [x] Rider can save a vehicle via profile page
- [x] Duplicate license plate rejected
- [x] Rider with saved vehicles sees selection at request time
- [x] New vehicle created during request is saved to profile

---

## TASK-005 — Service Request Flow (Rider)

**Objective:** Implement the complete rider request flow: map-based location selection, vehicle selection, price estimation, and request submission.

**Requirements covered:** FR-007, FR-008, BR-001, BR-007, BR-008, BR-009, BR-010  
**Architecture components:** Leaflet.js map, OpenRouteService API, Next.js API routes, `services` table, Supabase Realtime

**Dependencies:** TASK-002, TASK-003, TASK-004

**Implementation steps:**
1. Install Leaflet.js; create `MapView` component with OSM tiles (dynamic import, SSR disabled)
2. Create geocoding helper: address string → lat/lng via OpenRouteService Geocode API (server-side proxy)
3. Create reverse geocoding helper: lat/lng → address (for GPS-detected location)
4. Create distance calculation helper: 3-leg ORS Distance Matrix API call (server-side)
5. Create `POST /api/services/estimate` route: accepts origin + destination, finds nearest online driver, calculates 3-leg estimate, returns itemized breakdown. If no driver is online, return a specific `NO_DRIVERS_AVAILABLE` error.
6. Create `POST /api/services` route: validates eligibility (BR-001, account suspension), creates service record with status `requested`, returns service ID
7. Build step-by-step request wizard (pickup → destination → vehicle → review → confirm)
8. Show 3-component price breakdown on review step; format all prices as `$1.500,00` using `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`
9. On review step, if no driver is online, show block message: *"No hay conductores disponibles en este momento. Intentá de nuevo más tarde."* Disable the confirm button. (PD-020 / OQ-001)
10. After submission, redirect to status tracking screen (TASK-006)
11. Handle ORS unavailability with user-facing error

**Tests required:**
- UT-001-1 to UT-001-5 (price calculation)
- UT-004-1 to UT-004-4 (eligibility)
- IT-002-1 to IT-002-7
- E2E-001 steps 5–8

**Definition of Done:**
- [x] Rider can pin/enter pickup location on map
- [x] Rider can pin/enter destination on map
- [x] Price estimate shown with 3 itemized components; formatted as `$1.500,00`
- [x] Request submitted and service created in DB
- [x] Duplicate active request blocked with error
- [x] Suspended rider blocked at request step
- [x] No-drivers-online state shows block message; confirm button disabled

---

## TASK-006 — Real-time Status Tracking (Rider)

**Objective:** Show the rider their active service status, updating in real-time as the driver and operator change it.

**Requirements covered:** FR-010, FR-011, FR-012, FR-013  
**Architecture components:** Supabase Realtime, status screen UI

**Dependencies:** TASK-005

**Implementation steps:**
1. Create rider status screen: displays current status with visual progress bar
2. Set up Supabase Realtime subscription on `services` row by service ID
3. Show relevant info per status:
   - `requested`: "Waiting for driver..." + cancel button (free)
   - `assigned`: driver name, phone number, confirmed price + cancel button (strike warning)
   - `en_route`: "Your driver is on the way"
   - `in_progress`: "Service in progress"
   - `completed`: → trigger rating flow (TASK-009)
   - `cancelled`: reason + "Start new request" button
4. Implement free cancellation API: `POST /api/services/[id]/cancel` (from `requested` state)
5. Implement post-assignment cancellation API: same endpoint, adds strike, checks suspension trigger
6. Show cancel confirmation dialogs (UT-002 logic used here)
7. Update home screen: if rider has active service, show status screen instead of request form

**Tests required:**
- UT-002 (strike logic)
- UT-003 (transition validation)
- IT-005-1 to IT-005-4
- E2E-001 steps 9–12
- E2E-002, E2E-003

**Definition of Done:**
- [x] Status updates in real-time (< 3 seconds) on all status transitions
- [x] Free cancellation from "Requested" works without strike
- [x] Post-assignment cancellation adds strike and warns user
- [x] Account suspension triggered at 3 strikes
- [x] Home screen shows active service instead of request form

---

## TASK-007 — Driver Interface

**Objective:** Build the driver's interface: availability toggle, GPS tracking, job view, and status advancement.

**Requirements covered:** FR-014, FR-015, FR-016, FR-017  
**Architecture components:** `driver_profiles` table, GPS API, Supabase Realtime

**Dependencies:** TASK-002, TASK-003

**Implementation steps:**
1. Create driver home screen at `/driver` (protected — driver role only)
2. Implement availability toggle: online/offline; blocked if active assignment
3. Implement GPS tracking: browser Geolocation API; periodic updates to `driver_profiles.current_lat/lng` while online; stops when offline
4. Handle GPS permission denied: show error; block going online
5. Create job card component: shows assigned service details (rider name, pickup, destination, vehicle, price)
6. Set up Supabase Realtime: driver subscribes to their own `services` channel
7. Implement status advance buttons:
   - "I'm on my way" (assigned → en_route)
   - "I've arrived / Service started" (en_route → in_progress)
   - "Service completed" (in_progress → completed)
8. Create `PATCH /api/services/[id]/status` route for driver status transitions
9. Show "Awaiting assignment" state when no active job

**Tests required:**
- UT-003 (transition validation)
- IT-004-1 to IT-004-5
- M-004 (GPS permission on mobile)

**Definition of Done:**
- [x] Driver can toggle online/offline
- [x] GPS updates stored while driver is online
- [x] Driver cannot go offline during active service
- [x] Driver sees assigned job details
- [x] Driver can advance status through all steps
- [x] Status changes broadcast to rider in real-time

---

## TASK-008 — Admin Panel: Operator Functions

**Objective:** Build the operator view of the admin panel: request list, driver assignment, final price calculation.

**Requirements covered:** FR-022, BR-018, BR-019  
**Architecture components:** Admin panel UI at `/admin`, API routes, Supabase Realtime

**Dependencies:** TASK-003, TASK-005, TASK-007

**Implementation steps:**
1. Create admin layout at `/admin` (protected — operator and super_admin roles)
2. Create requests list view: pending requests (status = requested), ordered by `requested_at`
3. Set up Supabase Realtime on pending requests channel for the operator panel
4. Create request detail panel: rider info, pickup, destination, vehicle
5. Create driver assignment UI: dropdown of online, unassigned, active drivers
6. Implement `POST /api/services/[id]/assign` route:
   - Validate driver is online and unassigned
   - Check `driver_profiles.location_updated_at`: if older than **5 minutes** (confirmed threshold), return a `STALE_GPS` warning (HTTP 200 with warning flag, not a hard error) — operator must acknowledge before proceeding (PD-021 / OQ-002)
   - Calculate final price using assigned driver's GPS location (ORS API)
   - Update service: status → assigned, driver_id, final_price, all km legs, price_per_km_at_time
   - If operator proceeded with stale GPS, log a note in `service_status_log`
   - Broadcast via Realtime
   - Send push notification to rider
7. Implement stale GPS UX: show warning banner in assignment UI with "Refresh (wait up to 60s)" and "Proceed anyway" actions
8. Create active services list: in-progress assignments visible to operator
9. Implement operator cancel: `POST /api/services/[id]/cancel` from assigned state:
   - No strike added to rider (BR-030 / PD-023)
   - Send apology push notification to rider
   - Response includes previous service data (pickup, destination, vehicle_id) for pre-fill re-request

**Tests required:**
- IT-003-1 to IT-003-5
- E2E-004

**Definition of Done:**
- [x] Operator sees all pending requests in real-time
- [x] Operator can assign an online driver to a request
- [x] Stale GPS warning shown when driver location is older than 5 minutes
- [x] Operator can wait for GPS refresh or proceed with acknowledgement
- [x] Final price is calculated and displayed after assignment; formatted as `$1.500,00`
- [x] Rider receives real-time update on assignment
- [x] Offline/inactive drivers not available for assignment
- [x] Operator cancel from Assigned adds no strike; sends apology to rider with pre-fill data

---

## TASK-009 — Mutual Rating

**Objective:** Implement post-service rating for both rider and driver.

**Requirements covered:** FR-018, BR-024 to BR-027  
**Architecture components:** `ratings` table, rating UI, DB trigger for average recalculation

**Dependencies:** TASK-006, TASK-007

**Implementation steps:**
1. Create rating screen component: 1–5 star selector + optional comment + submit button
2. Trigger rating screen for rider when their service status becomes `completed` — **not** on `cancelled` (PD-025 / OQ-006)
3. Trigger rating screen for driver when they mark service `completed` — **not** on cancel
4. Create `POST /api/ratings` route: validates `service.status = 'completed'`, party hasn't rated yet, star 1–5
5. Confirm DB trigger (from TASK-003) updates `profiles.average_rating` after insert
6. Show "Thank you" message after submission; dismiss on skip

**Tests required:**
- UT-005-1 to UT-005-5
- IT-008-1 to IT-008-5
- E2E-001 steps 13–14
- M-010 (dismiss without rating)

**Definition of Done:**
- [x] Rating prompt appears on completion for both parties
- [x] Rating stored; second submission attempt rejected
- [x] Driver's average rating updated after each new rating
- [x] Rider's average rating updated after each new rating
- [x] Dismissal does not cause crash or repeated prompt

---

## TASK-010 — Push Notifications

**Objective:** Implement Web Push notifications for service status changes.

**Requirements covered:** FR-019  
**Architecture components:** Service worker, Web Push API, VAPID keys, `push_subscriptions` table

**Dependencies:** TASK-001, TASK-006

**Implementation steps:**
1. Generate VAPID key pair; store in environment variables
2. Extend service worker to handle push events and display notifications
3. Implement client-side push subscription: request permission, create subscription, `POST /api/push/subscribe`
4. Create `POST /api/push/subscribe` route: saves subscription to `push_subscriptions`
5. Create push sending utility: uses `web-push` npm library server-side
6. Integrate push sending into status transition API routes (assignment, en_route, in_progress, completed, cancelled)
7. Handle expired/invalid subscriptions gracefully (delete from DB on 410 response from push service)

**Tests required:**
- M-001 (push received with app in background)
- AC-019-1 to AC-019-3

**Definition of Done:**
- [ ] Rider receives push notification on each status change
- [ ] Notifications work with app backgrounded on Android Chrome
- [ ] Invalid subscriptions are cleaned up
- [ ] Notification content is meaningful (not generic)

---

## TASK-011 — Super-Admin: Driver Management & Pricing

**Objective:** Build the Super-Admin portions of the admin panel: driver CRUD and pricing configuration.

**Requirements covered:** FR-023, FR-024, BR-022, BR-023  
**Architecture components:** Admin panel `/admin`, API routes, `driver_profiles` table, `pricing_config` table

**Dependencies:** TASK-001, TASK-003

**Implementation steps:**
1. Create driver management page at `/admin/drivers`
2. Implement driver list with availability status and rating
3. Implement **pending driver applications** list: users who registered via `/driver/register` but have not been promoted (role = rider, registered from driver entry point). (PD-022 / OQ-003)
4. Implement promote-to-driver flow: Super-Admin selects a pending user, fills in DNI, phone, license number, license category; system creates `driver_profiles` row and updates `profiles.role` to `driver`
5. Implement edit driver profile form (DNI, phone, license number, license category)
6. Implement deactivate/reactivate driver toggle (with confirmation)
6. Create pricing configuration page at `/admin/pricing`
7. Show current per-km rate; implement inline edit with save
8. Create `PUT /api/admin/pricing` route (Super-Admin only)
9. Protect all Super-Admin routes from Operator access

**Tests required:**
- IT-003-4 (inactive driver blocked from assignment)
- IT-006-1 to IT-006-4
- AC-023-1 to AC-023-4

**Definition of Done:**
- [ ] Super-Admin sees pending driver applications (registered via /driver/register, not yet promoted)
- [ ] Super-Admin can promote a pending user to driver by filling in driver profile fields
- [ ] Promoted driver can access the driver interface immediately
- [ ] Super-Admin can deactivate a driver (excluded from assignment)
- [ ] Super-Admin can update per-km rate
- [ ] New rate used in subsequent estimates immediately
- [ ] Operators cannot access driver management or pricing pages

---

## TASK-012 — Service History & Rider Profile

**Objective:** Allow riders to view their past services and manage their profile and vehicles.

**Requirements covered:** FR-021  
**Architecture components:** `services` table, profile UI

**Dependencies:** TASK-005

**Implementation steps:**
1. Create `GET /api/services` route for rider: returns all non-active services ordered by date desc
2. Create service history page at `/profile/trips`
3. Show per-service: date, status badge, pickup address, destination, vehicle, final price, rating given
4. Show active service at top (if exists) linking to status screen
5. Create profile page at `/profile`: shows name, email, strike count, average rating, link to vehicles and trips

**Tests required:**
- AC-021-1 to AC-021-3
- Empty state test

**Definition of Done:**
- [ ] Rider sees all past services (completed + cancelled)
- [ ] Active service shows at top
- [ ] Each item shows required fields
- [ ] Empty state shown when no history

---

## TASK-013 — Analytics Dashboard (Super-Admin)

**Objective:** Build the basic analytics dashboard for Super-Admin.

**Requirements covered:** FR-025  
**Architecture components:** Admin panel, SQL aggregation queries via Supabase

**Dependencies:** TASK-003, TASK-008

**Implementation steps:**
1. Create analytics page at `/admin/analytics`
2. Implement date range filter (default: last 30 days)
3. Create `GET /api/admin/analytics` route with aggregation queries:
   - Total requests in period
   - Breakdown by status (completed, cancelled, in_progress)
   - Average time from `requested_at` to `assigned_at`
   - Average rating from `ratings` table
   - Cancellation rate (cancelled / total)
4. Display as simple stat cards and a small table

**Tests required:**
- AC-025-1 to AC-025-3

**Definition of Done:**
- [ ] All 5 required metrics displayed
- [ ] Date range filter works correctly
- [ ] Data reflects real-time DB state
- [ ] Operators cannot access analytics page

---

## TASK-014 — Email Notifications

**Objective:** Send transactional emails for registration confirmation and strike warnings.

**Requirements covered:** FR-020  
**Architecture components:** Resend SDK, Next.js API routes

**Dependencies:** TASK-002

**Implementation steps:**
1. Install `resend` npm package
2. Create email templates (plain HTML or React Email):
   - Registration confirmation
   - Strike warning (includes current strike count)
3. Create `sendEmail` utility wrapping the Resend SDK
4. Integrate registration confirmation email into the registration API route (TASK-002 step 10 — verify it's done)
5. Integrate strike warning email into the cancellation API route (TASK-006 step 5)

**Tests required:**
- IT-001-1 (confirmation email sent)
- AC-020-2 (strike email sent)
- AC-020-3 (delivery within 5 minutes)

**Definition of Done:**
- [ ] Registration confirmation email delivered
- [ ] Strike warning email sent on each strike
- [ ] Emails render correctly on mobile

---

## TASK-015 — PWA Hardening & Production Readiness

**Objective:** Ensure the app meets all PWA criteria, is production-ready, and passes the MVP launch checklist.

**Requirements covered:** PRD §7 (deployment), MVP_CHECKLIST.md  
**Architecture components:** Service worker, Vercel, error handling

**Dependencies:** All previous tasks

**Implementation steps:**
1. Verify PWA manifest: name, icons (at least 192px and 512px), `display: standalone`, `start_url`
2. Verify service worker caches essential assets for offline resilience
3. Run Lighthouse audit; achieve PWA green on "Installable" criteria
4. Review all error states: 404, 500, network offline, ORS unavailable
5. Implement basic rate limiting on API routes (Next.js middleware)
6. Review all environment variables are server-side only (no leakage to client bundle)
7. Test on Android Chrome (install + push notifications)
8. Test on iOS Safari 16.4+ (install + push notifications)
9. Create `CONTRIBUTING.md` with local dev setup instructions
10. Execute MVP launch checklist (see MVP_CHECKLIST.md)

**Definition of Done:**
- [ ] App is installable as PWA on Android and iOS
- [ ] Push notifications work on both platforms
- [ ] No critical errors in production logs
- [ ] All MVP_CHECKLIST items checked
- [ ] App deployed to production Vercel URL

---

## Implementation Order

```
TASK-001 (Foundation)
    ↓
TASK-003 (DB Schema) ─── TASK-002 (Auth)
    ↓                         ↓
TASK-004 (Vehicles)    TASK-007 (Driver interface)
    ↓                         ↓
TASK-005 (Request flow)   TASK-011 (Admin: drivers + pricing)
    ↓                         ↓
TASK-006 (Status tracking) ─── TASK-008 (Admin: assignment)
    ↓
TASK-009 (Rating)
TASK-010 (Push notifications)
TASK-012 (Service history)
TASK-014 (Email)
TASK-013 (Analytics)
    ↓
TASK-015 (PWA hardening + production)
```
