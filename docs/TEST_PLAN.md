# TEST_PLAN — Regreso Seguro

**Version:** 1.0  
**Status:** Approved for MVP  
**Last updated:** 2026-09-25  

---

## Testing Strategy

Tests are derived from requirements. Every acceptance criterion must be covered by at least one test case.

### Test levels used in this project

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | Pure business logic functions (price calc, strike logic, status transitions) |
| Integration | Vitest + Supabase local | API routes with real DB (local Supabase instance) |
| End-to-end | Playwright | Critical user journeys in a real browser |
| Manual | Checklist | Edge cases, push notifications, PWA install |

### Traceability format

Each test case references its source requirement:
`[FR-XXX / AC-XXX-X]`

---

## Unit Tests

### UT-001 — Price Calculation
**Source:** FR-008, FR-009, BR-012  
**File:** `lib/pricing/calculatePrice.test.ts`

| Test | Description |
|---|---|
| UT-001-1 | Correctly sums 3 legs × per-km rate |
| UT-001-2 | Returns 0 for any zero-distance leg |
| UT-001-3 | Handles large distances without overflow |
| UT-001-4 | Throws error if per-km rate is zero or negative |
| UT-001-5 | Price is calculated to 2 decimal places |

### UT-002 — Strike System
**Source:** FR-012, FR-013, BR-003, BR-004, BR-005  
**File:** `lib/strikes/strikeLogic.test.ts`

| Test | Description |
|---|---|
| UT-002-1 | Free cancellation (status = requested) does not add strike |
| UT-002-2 | Post-assignment cancellation adds exactly 1 strike |
| UT-002-3 | Strike count reaching 3 returns suspension flag |
| UT-002-4 | Strike count below 3 does not return suspension flag |

### UT-003 — Status Transition Validation
**Source:** FR-010, BR-014, BR-015  
**File:** `lib/services/statusTransitions.test.ts`

| Test | Description |
|---|---|
| UT-003-1 | Valid transition `requested → assigned` is allowed |
| UT-003-2 | Valid transition `assigned → en_route` is allowed |
| UT-003-3 | Valid transition `en_route → in_progress` is allowed |
| UT-003-4 | Valid transition `in_progress → completed` is allowed |
| UT-003-5 | Invalid transition `requested → in_progress` is rejected |
| UT-003-6 | Invalid transition `completed → cancelled` is rejected |
| UT-003-7 | Rider can trigger `requested → cancelled` |
| UT-003-8 | Rider can trigger `assigned → cancelled` |
| UT-003-9 | Driver cannot trigger `requested → cancelled` |
| UT-003-10 | Operator can trigger `assigned → cancelled` |

### UT-004 — Request Eligibility Check
**Source:** FR-007, BR-001, BR-007  
**File:** `lib/services/eligibilityCheck.test.ts`

| Test | Description |
|---|---|
| UT-004-1 | Authenticated rider with no active service is eligible |
| UT-004-2 | Rider with an active service is ineligible |
| UT-004-3 | Suspended rider is ineligible |
| UT-004-4 | Unauthenticated user is ineligible |

### UT-005 — Rating Validation
**Source:** FR-018, BR-025  
**File:** `lib/ratings/ratingValidation.test.ts`

| Test | Description |
|---|---|
| UT-005-1 | Star value of 1 is valid |
| UT-005-2 | Star value of 5 is valid |
| UT-005-3 | Star value of 0 is rejected |
| UT-005-4 | Star value of 6 is rejected |
| UT-005-5 | Non-integer star value is rejected |

---

## Integration Tests

### IT-001 — Registration Flow
**Source:** FR-001, AC-001-1 to AC-001-4

| Test | Description |
|---|---|
| IT-001-1 | POST /api/auth/register with valid data creates user and sends email |
| IT-001-2 | POST /api/auth/register with duplicate email returns 409 |
| IT-001-3 | POST /api/auth/register with short password returns 422 |
| IT-001-4 | POST /api/auth/register with invalid email format returns 422 |

### IT-002 — Service Request Creation
**Source:** FR-007, AC-007-1 to AC-007-5

| Test | Description |
|---|---|
| IT-002-1 | Authenticated rider with no active service creates request successfully |
| IT-002-2 | Rider with active service gets 409 conflict |
| IT-002-3 | Suspended rider gets 403 forbidden |
| IT-002-4 | Unauthenticated request gets 401 |
| IT-002-5 | Request with missing pickup gets 422 |
| IT-002-6 | Request with missing destination gets 422 |
| IT-002-7 | Request with missing vehicle gets 422 |

### IT-003 — Driver Assignment
**Source:** FR-022, AC-022-1 to AC-022-4

| Test | Description |
|---|---|
| IT-003-1 | Operator assigns online driver to requested service → status becomes assigned |
| IT-003-2 | Assignment calculates and stores final price |
| IT-003-3 | Assignment with offline driver returns 422 |
| IT-003-4 | Assignment with inactive driver returns 422 |
| IT-003-5 | Non-operator user cannot assign a driver (403) |

### IT-004 — Status Transitions via API
**Source:** FR-010, FR-015, AC-010-1 to AC-010-4

| Test | Description |
|---|---|
| IT-004-1 | Driver advances status from assigned → en_route |
| IT-004-2 | Driver advances status from en_route → in_progress |
| IT-004-3 | Driver advances status from in_progress → completed |
| IT-004-4 | Rider cannot advance status (403) |
| IT-004-5 | Invalid transition attempt returns 422 |

### IT-005 — Cancellation and Strike
**Source:** FR-012, FR-013, AC-013-1 to AC-013-4

| Test | Description |
|---|---|
| IT-005-1 | Cancel from requested → no strike added |
| IT-005-2 | Cancel from assigned → 1 strike added to rider |
| IT-005-3 | Cancel from assigned with 2 existing strikes → account suspended |
| IT-005-4 | Cancel from assigned with suspended account → still cancelled |

### IT-006 — Pricing Configuration
**Source:** FR-024, AC-024-1 to AC-024-3

| Test | Description |
|---|---|
| IT-006-1 | Super-Admin updates per-km rate successfully |
| IT-006-2 | Updated rate is used in subsequent price calculations |
| IT-006-3 | Operator cannot update pricing (403) |
| IT-006-4 | Historical service prices are not recalculated after rate change |

### IT-007 — Vehicle Management
**Source:** FR-005, FR-006, AC-005-1 to AC-006-3

| Test | Description |
|---|---|
| IT-007-1 | Rider saves new vehicle to profile |
| IT-007-2 | Rider with saved vehicle sees it offered at request time |
| IT-007-3 | Duplicate license plate for same rider returns 409 |
| IT-007-4 | New vehicle created during request is saved to profile |

### IT-008 — Rating Submission
**Source:** FR-018, AC-018-1 to AC-018-6

| Test | Description |
|---|---|
| IT-008-1 | Rider can rate driver after completed service |
| IT-008-2 | Driver can rate rider after completed service |
| IT-008-3 | Second rating attempt by same party returns 409 |
| IT-008-4 | Rating on non-completed service returns 422 |
| IT-008-5 | Driver's average rating is recalculated after new rating |

---

## End-to-End Tests

### E2E-001 — Full Rider Journey (Happy Path)
**Source:** UF-001 → UF-004 → UF-005 → UF-008

**Steps:**
1. User opens app without logging in — sees map and form
2. User enters pickup and destination
3. App prompts login — user registers
4. Returns to request form; selects vehicle (creates new)
5. Sees 3-component price estimate
6. Submits request
7. Status shows "Requested"
8. Admin assigns driver (via API call in test)
9. Status updates to "Assigned" in real-time
10. Driver marks "En Route", then "In Progress", then "Completed"
11. Status updates in real-time at each step
12. Rating prompt appears
13. User submits rating

**Expected outcome:** Request created → assigned → completed → rated; all status transitions reflected in UI.

### E2E-002 — Cancellation with Strike
**Source:** UF-006, FR-013

**Steps:**
1. Rider creates a request
2. Admin assigns driver
3. Rider cancels after assignment
4. Warning dialog shown with strike consequence
5. Rider confirms
6. Status = cancelled; strike added

**Expected outcome:** Strike visible in rider profile; cancellation confirmed.

### E2E-003 — Account Suspension
**Source:** FR-004, BR-002, BR-005

**Steps:**
1. Rider has 2 existing strikes
2. Rider creates request; driver assigned
3. Rider cancels post-assignment → 3rd strike → account suspended
4. Rider tries to create new request → blocked with suspension message

**Expected outcome:** Rider cannot submit new requests.

### E2E-004 — Admin Driver Assignment Flow
**Source:** UF-010, FR-022

**Steps:**
1. Log in as operator
2. View pending requests list
3. Select a request
4. Assign an online driver
5. Verify final price is shown
6. Verify rider's status screen updates

**Expected outcome:** Operator completes assignment; rider sees update.

### E2E-005 — Pricing Configuration
**Source:** UF-011, FR-024

**Steps:**
1. Log in as Super-Admin
2. Navigate to pricing
3. Change per-km rate
4. Create a new service request
5. Verify estimated price uses new rate

**Expected outcome:** New rate applied to new requests; old requests unchanged.

---

## Manual Test Checklist

| # | Test | Criteria |
|---|---|---|
| M-001 | Push notification received when driver assigned | Notification arrives with browser closed (background) |
| M-002 | PWA install on Android | App installable from Chrome; icon appears on home screen |
| M-003 | PWA install on iOS 16.4+ | App installable from Safari; push notifications work after install |
| M-004 | GPS permission prompt on driver app | Driver sees permission request on first go-online |
| M-005 | Driver GPS fallback | App handles GPS loss gracefully without crashing |
| M-006 | Map tiles load on mobile | OpenStreetMap tiles visible on mobile Chrome and Safari |
| M-007 | Map tiles load on slow connection | Tiles show loading state; app remains usable |
| M-008 | Form preserved after auth gate | Pickup/destination preserved when user returns from login |
| M-009 | Realtime update on reconnect | Status shows correctly after reconnecting from offline |
| M-010 | Rating prompt dismissed | No crash or loop; marked as skipped |

---

## Edge Case Coverage

| Edge case | Covered by |
|---|---|
| No drivers online at request time | OQ-001 documented; IT-002-1 notes fallback |
| ORS API unavailable | IT-002 setup validates error handling |
| Duplicate email registration | IT-001-2 |
| Concurrent cancellations | IT-005 (sequential tests) |
| Rating after dismissal | M-010 |
| Driver goes offline mid-service | UT-003, IT-004 (transition blocked) |
| Stale GPS on driver at assignment | Noted as OQ-002 |

---

## Traceability Matrix

| Requirement | Unit test | Integration test | E2E test |
|---|---|---|---|
| FR-001 (Registration) | — | IT-001 | E2E-001 |
| FR-002 (Login) | — | IT-001 | E2E-001 |
| FR-003 (Lazy auth gate) | — | — | E2E-001 |
| FR-004 (Suspension check) | UT-004 | IT-002-3 | E2E-003 |
| FR-005 (Save vehicle) | — | IT-007 | E2E-001 |
| FR-006 (Select vehicle) | — | IT-007 | E2E-001 |
| FR-007 (Create request) | UT-004 | IT-002 | E2E-001 |
| FR-008 (Preliminary estimate) | UT-001 | IT-002-1 | E2E-001 |
| FR-009 (Final price) | UT-001 | IT-003-2 | E2E-001 |
| FR-010 (Status lifecycle) | UT-003 | IT-004 | E2E-001 |
| FR-011 (Realtime) | — | — | E2E-001 |
| FR-012 (Free cancellation) | UT-002 | IT-005-1 | — |
| FR-013 (Strike cancellation) | UT-002 | IT-005-2,3 | E2E-002 |
| FR-014 (Driver view job) | — | IT-003 | E2E-004 |
| FR-015 (Driver updates status) | UT-003 | IT-004 | E2E-001 |
| FR-016 (Driver GPS) | — | — | M-004 |
| FR-017 (Driver availability) | — | IT-004-4 | — |
| FR-018 (Rating) | UT-005 | IT-008 | E2E-001 |
| FR-019 (Push notifications) | — | — | M-001 |
| FR-020 (Email) | — | IT-001-1 | — |
| FR-021 (Service history) | — | IT-002-1 | — |
| FR-022 (Admin assign) | — | IT-003 | E2E-004 |
| FR-023 (Driver management) | — | IT-003-4 | — |
| FR-024 (Pricing config) | — | IT-006 | E2E-005 |
| FR-025 (Analytics) | — | — | Manual |
