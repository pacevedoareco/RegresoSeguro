# REQUIREMENTS — Regreso Seguro

**Version:** 1.1
**Status:** Approved for MVP
**Last updated:** 2026-09-25

---

## Requirement Format

Each requirement includes:
- **ID** — unique identifier
- **Description** — what the system must do
- **Source** — DOCUMENT | USER_DECISION | ARCHITECTURE_DECISION | AI_RECOMMENDATION
- **Priority** — P0 (must-have MVP) | P1 (should-have MVP) | P2 (nice-to-have MVP)
- **Preconditions** — what must be true before this applies
- **Expected behavior** — system response
- **Acceptance criteria** — objectively testable outcomes
- **Edge cases / Error behavior**

---

## Authentication & Registration

### FR-001 — User Registration
- **Source:** USER_DECISION (Q4 interview)
- **Priority:** P0
- **Description:** A new user can create an account using email and password.
- **Preconditions:** User is not logged in.
- **Expected behavior:** User submits email + password; system creates account via Supabase Auth; sends confirmation email via Resend; redirects user to the home screen.
- **Acceptance criteria:**
  - AC-001-1: Given a valid email and password (min 8 chars), account is created successfully.
  - AC-001-2: A confirmation email is sent to the registered address within 60 seconds.
  - AC-001-3: Duplicate email registration returns a clear error message.
  - AC-001-4: Weak password (< 8 chars) is rejected with a descriptive error.
- **Edge cases:** Email already in use; password too short; invalid email format; network timeout.

### FR-002 — User Login
- **Source:** USER_DECISION
- **Priority:** P0
- **Description:** A registered user can log in with email and password.
- **Preconditions:** Account exists and is confirmed.
- **Expected behavior:** System validates credentials via Supabase Auth; establishes session; redirects to home.
- **Acceptance criteria:**
  - AC-002-1: Valid credentials produce an authenticated session.
  - AC-002-2: Invalid credentials show an error without specifying which field is wrong.
  - AC-002-3: Unconfirmed accounts cannot log in and receive a relevant message.
- **Edge cases:** Suspended account (3 strikes); network failure.

### FR-003 — Lazy Authentication Gate
- **Source:** USER_DECISION (Q7 interview)
- **Priority:** P0
- **Description:** Unauthenticated users can browse the app (map, request flow, estimated cost) but are prompted to log in or register when they attempt to submit a service request.
- **Preconditions:** User navigates to request submission step without being logged in.
- **Expected behavior:** System intercepts the submission, displays a login/register modal or redirects to the auth screen, then returns the user to the request flow after successful authentication.
- **Acceptance criteria:**
  - AC-003-1: Unauthenticated user can view the map and request form without being redirected.
  - AC-003-2: Unauthenticated user who taps "Request Service" is shown the login/register screen.
  - AC-003-3: After login, the user is returned to the request flow with their previously entered data preserved.
- **Edge cases:** User abandons login; user registers a new account mid-flow.

### FR-004 — Account Suspension Check
- **Source:** USER_DECISION (Q6 interview)
- **Priority:** P0
- **Description:** A user with 3 or more strikes cannot log in or submit new requests. The system displays a clear suspension message.
- **Preconditions:** User account has `strikes >= 3`.
- **Expected behavior:** Login succeeds (session is established) but any attempt to submit a request is blocked with a suspension message.
- **Acceptance criteria:**
  - AC-004-1: User with 3 strikes sees a suspension notice when attempting to request a service.
  - AC-004-2: Suspension message explains why the account is suspended.
  - AC-004-3: Suspended user can still view their service history.
- **Edge cases:** Strike count modified by admin.

---

## Vehicle Management

### FR-005 — Save Vehicle to Profile
- **Source:** USER_DECISION (Q23 interview)
- **Priority:** P0
- **Description:** A logged-in rider can save one or more vehicles to their profile (license plate, make/model, color).
- **Preconditions:** User is authenticated.
- **Expected behavior:** User enters license plate + make/model + color; system saves vehicle linked to user account.
- **Acceptance criteria:**
  - AC-005-1: Vehicle with all required fields is saved and appears in the user's vehicle list.
  - AC-005-2: Duplicate license plate for the same user is rejected with an error.
  - AC-005-3: User can save multiple vehicles.
- **Edge cases:** Empty fields; invalid license plate format.

### FR-006 — Select or Create Vehicle at Request Time
- **Source:** USER_DECISION (Q23 interview)
- **Priority:** P0
- **Description:** When creating a service request, if the rider has saved vehicles, the app offers to reuse one or create a new one. If no saved vehicles exist, the user enters vehicle info which is also saved to their profile.
- **Preconditions:** User is authenticated and on the request form.
- **Expected behavior:** If saved vehicles exist, show a selection list plus "Add new vehicle" option. Selected vehicle's data pre-fills the request. New vehicle data is saved to profile and used in the request.
- **Acceptance criteria:**
  - AC-006-1: User with one saved vehicle sees it pre-selected by default.
  - AC-006-2: User can choose a different saved vehicle or create a new one.
  - AC-006-3: New vehicle created during a request is saved to the user's profile.
- **Edge cases:** User has no saved vehicles (direct to creation form).

---

## Service Request

### FR-007 — Create Service Request
- **Source:** DOCUMENT (README — MVP scope)
- **Priority:** P0
- **Description:** An authenticated rider with no active service and fewer than 3 strikes can submit a new service request specifying pickup location, destination, and vehicle.
- **Preconditions:** User authenticated, no active service in progress, account not suspended.
- **Expected behavior:** User enters/confirms pickup location (map + address), destination (map + address), selects vehicle. System calculates preliminary price estimate using nearest online driver. User confirms and submits. Request is created with status "Requested".
- **Acceptance criteria:**
  - AC-007-1: Request is created and status is "Requested".
  - AC-007-2: Preliminary price estimate is shown before submission.
  - AC-007-3: Request is rejected if user has an active (non-completed) service.
  - AC-007-4: Request is rejected if account is suspended.
  - AC-007-5: All required fields (pickup, destination, vehicle) must be filled; submission is blocked otherwise.
- **Edge cases:** No drivers online (blocked per OQ-001 resolution); map location services unavailable.

### FR-008 — Preliminary Price Estimate
- **Source:** USER_DECISION (Q25 — Option C, Q9)
- **Priority:** P0
- **Description:** Before submitting a request, the rider sees a price estimate based on 3 distance legs: driver → pickup, pickup → destination, destination → driver. Uses the nearest online driver's GPS location at request time.
- **Preconditions:** At least one driver is online with a known GPS location.
- **Expected behavior:** System queries nearest online driver; calls OpenRouteService for 3 leg distances; applies per-km price from admin config; sums all 3 components and displays total estimate with itemized breakdown. All prices formatted as `$1.500,00` (es-AR locale).
- **Acceptance criteria:**
  - AC-008-1: Estimate is displayed before the user submits the request.
  - AC-008-2: Estimate shows 3 itemized components (pickup leg, ride leg, return leg) plus total.
  - AC-008-3: Estimate uses the current per-km price from admin configuration.
  - AC-008-4: When no driver is online, the system **blocks the request** and shows: *"No hay conductores disponibles en este momento. Intentá de nuevo más tarde."* The rider cannot submit until a driver comes online. (OQ-001 resolved)
- **Edge cases:** OpenRouteService API unavailable or rate limit hit; driver goes offline between estimate calculation and request submission.

### FR-009 — Final Price Calculation After Assignment
- **Source:** USER_DECISION (Q11 — Option C, Q9)
- **Priority:** P0
- **Description:** Once a driver is assigned to a request, the system recalculates the final price using the actual assigned driver's GPS location.
- **Preconditions:** Request status is "Assigned"; driver has a known GPS location.
- **Expected behavior:** System recalculates 3-leg price using assigned driver's location; updates the request's final price; notifies rider of the confirmed price.
- **Acceptance criteria:**
  - AC-009-1: Final price is calculated using the assigned driver's actual GPS location.
  - AC-009-2: Final price is visible to the rider once the driver is assigned.
  - AC-009-3: Final price is stored on the service record.
- **Edge cases:** Driver's GPS location is stale or unavailable at assignment time.

---

## Status Tracking

### FR-010 — Service Status Lifecycle
- **Source:** DOCUMENT (README — MVP scope)
- **Priority:** P0
- **Description:** Every service request progresses through defined states. Each transition has a defined actor.
- **States and transitions:**

| From | To | Actor |
|---|---|---|
| — | Requested | Rider (submits request) |
| Requested | Assigned | Operator (assigns driver) |
| Assigned | En Route | Driver (marks themselves en route) |
| En Route | In Progress | Driver (marks service started) |
| In Progress | Completed | Driver (marks service completed) |
| Requested | Cancelled | Rider (free cancellation) |
| Assigned | Cancelled | Rider (+1 strike) or Operator |

- **Acceptance criteria:**
  - AC-010-1: Status transitions only occur in the defined order.
  - AC-010-2: Only the defined actor for each transition can trigger it.
  - AC-010-3: Each transition is timestamped and stored.
  - AC-010-4: Completed services cannot change status.

### FR-011 — Real-time Status Updates
- **Source:** ARCHITECTURE_DECISION (Q22 — Supabase Realtime)
- **Priority:** P0
- **Description:** When a service status changes, all relevant parties (rider, driver, operator) receive the update in real-time without manual refresh.
- **Preconditions:** Parties are connected to the app.
- **Expected behavior:** Supabase Realtime broadcasts status changes; rider's app updates the status display immediately; driver's app updates; admin panel updates.
- **Acceptance criteria:**
  - AC-011-1: Status change is reflected on all connected clients within 3 seconds.
  - AC-011-2: If a user reconnects after being offline, they see the current status.
- **Edge cases:** Client is offline; client reconnects after status change.

---

## Cancellation & Strike System

### FR-012 — Free Cancellation (Requested Status)
- **Source:** USER_DECISION (Q6 interview)
- **Priority:** P0
- **Description:** A rider can cancel their request while the status is "Requested" with no penalty.
- **Preconditions:** Service status is "Requested"; rider is authenticated.
- **Expected behavior:** Rider taps "Cancel"; service status changes to "Cancelled"; no strike added; rider can submit a new request.
- **Acceptance criteria:**
  - AC-012-1: Cancellation from "Requested" changes status to "Cancelled" with no strike.
  - AC-012-2: Rider is shown a confirmation prompt before cancellation.
  - AC-012-3: Rider can create a new request immediately after free cancellation.

### FR-013 — Post-Assignment Cancellation with Strike
- **Source:** USER_DECISION (Q6 interview)
- **Priority:** P0
- **Description:** If a rider cancels after the status is "Assigned" (driver has been assigned), 1 strike is added to their account.
- **Preconditions:** Service status is "Assigned"; rider is authenticated.
- **Expected behavior:** Rider taps "Cancel"; system adds 1 strike to rider's account; service status changes to "Cancelled"; system checks if strikes = 3 and suspends account if so.
- **Acceptance criteria:**
  - AC-013-1: Cancellation from "Assigned" status adds 1 strike to the rider's account.
  - AC-013-2: Rider is warned about the strike consequence before confirming cancellation.
  - AC-013-3: If total strikes reach 3, account is suspended immediately.
  - AC-013-4: Rider receives a notification of the strike and current strike count.
- **Edge cases:** Concurrent cancellations; strike count exactly at 2 before this cancellation.

---

## Driver Interface

### FR-014 — Driver Views Assigned Job
- **Source:** USER_DECISION (Q2 interview)
- **Priority:** P0
- **Description:** A logged-in driver can see their currently assigned service including rider info, pickup location, destination, and vehicle details.
- **Preconditions:** Driver is authenticated; driver has an assigned service.
- **Expected behavior:** Driver's home screen shows current assignment with all relevant details.
- **Acceptance criteria:**
  - AC-014-1: Assigned job details (pickup, destination, vehicle, rider name) are visible.
  - AC-014-2: Driver sees the confirmed service price.
  - AC-014-3: Driver with no assignment sees an "awaiting assignment" state.

### FR-015 — Driver Updates Service Status
- **Source:** USER_DECISION (Q2 interview)
- **Priority:** P0
- **Description:** The driver can advance the service status at each step (En Route → In Progress → Completed).
- **Preconditions:** Driver is authenticated and has an active assignment.
- **Expected behavior:** Driver taps a status-advance button; system validates the transition; updates status; broadcasts via Realtime.
- **Acceptance criteria:**
  - AC-015-1: Driver can only advance to the next valid status (no skipping).
  - AC-015-2: Status change is broadcast to rider and operator in real-time.
  - AC-015-3: "Completed" status triggers the mutual rating prompt for both parties.

### FR-016 — Driver GPS Location
- **Source:** USER_DECISION (Q10 — Option B, Q12)
- **Priority:** P0
- **Description:** When a driver is online (availability = online), the app continuously captures and stores the driver's GPS location.
- **Preconditions:** Driver is logged in and has set availability to "online"; device has location permission granted.
- **Expected behavior:** App requests location permission on first use; when driver goes online, begins periodic GPS updates stored in the database; when driver goes offline, stops updates.
- **Acceptance criteria:**
  - AC-016-1: Driver's GPS coordinates are updated at regular intervals when online.
  - AC-016-2: Location is not stored when driver is offline.
  - AC-016-3: If location permission is denied, driver cannot set availability to "online".
- **Edge cases:** GPS signal lost; app backgrounded; device battery saver mode.

### FR-017 — Driver Availability Toggle
- **Source:** USER_DECISION (Q12 interview)
- **Priority:** P0
- **Description:** A driver can toggle their availability between "online" and "offline".
- **Preconditions:** Driver is authenticated.
- **Expected behavior:** Toggling online begins GPS tracking; toggling offline stops GPS tracking and removes driver from assignment pool.
- **Acceptance criteria:**
  - AC-017-1: Availability change is reflected immediately in the admin panel.
  - AC-017-2: Offline drivers are not shown as available for assignment.
  - AC-017-3: Driver with an active assignment cannot go offline until service is completed or cancelled.

---

## Mutual Rating

### FR-018 — Post-Service Rating
- **Source:** USER_DECISION (Q13 interview)
- **Priority:** P1
- **Description:** After a service is marked "Completed", both rider and driver are prompted to rate each other. Rating is 1–5 stars with an optional comment.
- **Preconditions:** Service status is "Completed".
- **Expected behavior:** In-app rating screen appears automatically for both parties after completion. Each party submits a 1–5 star rating and optional text comment. Ratings are stored and averaged into the user's/driver's profile rating.
- **Acceptance criteria:**
  - AC-018-1: Rating prompt appears automatically on "Completed" status for both rider and driver.
  - AC-018-2: Rating is 1–5 stars; comment is optional.
  - AC-018-3: Rating can only be submitted once per service per party.
  - AC-018-4: Driver's average rating is updated on their profile.
  - AC-018-5: Rider's average rating is updated on their profile.
  - AC-018-6: Rating prompt can be dismissed; unrated services are tracked but not penalized.
- **Edge cases:** User closes app before rating; repeated submission attempts.

---

## Notifications

### FR-019 — Push Notifications (PWA)
- **Source:** ARCHITECTURE_DECISION (Q5 — Option C)
- **Priority:** P1
- **Description:** The app sends Web Push notifications to riders when their service status changes (Assigned, En Route, In Progress, Completed, Cancelled).
- **Preconditions:** Rider has granted push notification permission in the browser.
- **Expected behavior:** On each status change, the system sends a push notification to the rider with the new status and a relevant message.
- **Acceptance criteria:**
  - AC-019-1: Rider receives a push notification for each status transition.
  - AC-019-2: Notification contains a meaningful message (e.g., "Your driver is on the way").
  - AC-019-3: Notification is sent even when the app is in the background.
- **Edge cases:** Permission denied; browser does not support push; notification delivery failure.

### FR-020 — Transactional Email Notifications
- **Source:** ARCHITECTURE_DECISION (Q19 — Resend)
- **Priority:** P1
- **Description:** The system sends transactional emails for key events: registration confirmation, service confirmation, strike warning.
- **Preconditions:** User has a confirmed email address.
- **Acceptance criteria:**
  - AC-020-1: Registration confirmation email is sent after account creation.
  - AC-020-2: Strike warning email is sent when a rider receives a strike.
  - AC-020-3: Emails are delivered within 5 minutes of the triggering event.

---

## Service History

### FR-021 — Rider Service History
- **Source:** USER_DECISION (Q24 — Option A)
- **Priority:** P1
- **Description:** An authenticated rider can view a list of their past services (completed and cancelled) with key details.
- **Preconditions:** Rider is authenticated.
- **Expected behavior:** History screen shows a chronological list of past services with date, status, origin, destination, vehicle used, final price, and rating given.
- **Acceptance criteria:**
  - AC-021-1: All past services (completed and cancelled) appear in history.
  - AC-021-2: Active service (in progress) appears at the top.
  - AC-021-3: Each history item shows date, status, pickup address, destination, price.
- **Edge cases:** No service history yet (empty state).

---

## Admin Panel

### FR-022 — Request Management (Operator)
- **Source:** DOCUMENT (README — admin panel scope)
- **Priority:** P0
- **Description:** An operator can view all pending and active service requests and assign an available driver to a "Requested" service.
- **Preconditions:** User is authenticated with Operator or Super-Admin role.
- **Expected behavior:** Admin panel shows a list of requests with status, rider info, vehicle, location, and timestamps. Operator selects a request and chooses from a list of online/available drivers to assign.
- **Acceptance criteria:**
  - AC-022-1: All requests in "Requested" status are prominently shown.
  - AC-022-2: Operator can assign a driver from the list of registered, available drivers.
  - AC-022-3: Assignment triggers status change to "Assigned" and notifies all parties.
  - AC-022-4: Offline or already-assigned drivers are not available for selection.

### FR-023 — Driver Management (Super-Admin)
- **Source:** USER_DECISION (Q14 — Option B)
- **Priority:** P0
- **Description:** Super-Admin can create, view, edit, and deactivate driver profiles.
- **Preconditions:** User is authenticated with Super-Admin role.
- **Expected behavior:** CRUD interface for driver profiles (name, DNI, phone, license number, license category, status).
- **Acceptance criteria:**
  - AC-023-1: Super-Admin promotes an existing registered user to driver and fills in required driver profile fields (DNI, license number, license category). (OQ-003 resolved)
  - AC-023-2: Super-Admin can deactivate a driver (deactivated drivers cannot be assigned).
  - AC-023-3: Driver list shows current availability and rating.
  - AC-023-4: Super-Admin sees a list of accounts registered via `/driver/register` pending promotion.

### FR-024 — Pricing Configuration (Super-Admin)
- **Source:** USER_DECISION (Q9 interview)
- **Priority:** P0
- **Description:** Super-Admin can configure the price per kilometer used for all 3 pricing legs.
- **Preconditions:** User is authenticated with Super-Admin role.
- **Expected behavior:** Pricing screen shows current per-km rate (and optionally a base fare). Super-Admin updates values; new values are used for all subsequent price calculations.
- **Acceptance criteria:**
  - AC-024-1: Current per-km rate is visible to Super-Admin.
  - AC-024-2: Rate changes take effect immediately for new requests.
  - AC-024-3: Historical requests retain the price calculated at their time.

### FR-025 — Analytics Dashboard (Super-Admin)
- **Source:** DOCUMENT (README — "Analítica y administración mínima")
- **Priority:** P1
- **Description:** Super-Admin can view basic operational metrics.
- **Metrics to display:**
  - Total requests (by period)
  - Requests by status (completed, cancelled, in progress)
  - Average response time (Requested → Assigned)
  - CSAT/NPS summary (average rating)
  - Cancellation rate
- **Acceptance criteria:**
  - AC-025-1: Dashboard displays all listed metrics.
  - AC-025-2: Metrics can be filtered by date range.
  - AC-025-3: Data reflects the current state of the database.
