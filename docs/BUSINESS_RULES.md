# BUSINESS_RULES — Regreso Seguro

**Version:** 1.1
**Status:** Approved for MVP
**Last updated:** 2026-09-25

---

## Rule Format

Each rule is:
- **Explicit** — stated precisely, not implied
- **Testable** — can be verified with a test case
- **Sourced** — traceable to a decision or document

---

## Authentication & Account

### BR-001 — One Active Request Per Rider
A rider may not submit a new service request while they have a request in any non-terminal status (Requested, Assigned, En Route, In Progress).  
**Source:** USER_DECISION (interview)  
**Terminal statuses:** Completed, Cancelled

### BR-002 — Account Suspension at 3 Strikes
A rider account with `strikes >= 3` is suspended. Suspended riders cannot submit new service requests.  
**Source:** USER_DECISION (Q6)

### BR-003 — Strike on Post-Assignment Cancellation
Cancelling a service request after it reaches status "Assigned" adds exactly 1 strike to the rider's account.  
**Source:** USER_DECISION (Q6)

### BR-004 — Free Cancellation While Requested
Cancelling a service request while status is "Requested" (before a driver is assigned) adds no strike.  
**Source:** USER_DECISION (Q6)

### BR-005 — Suspension Is Immediate
Account suspension takes effect immediately when the strike count reaches 3. It is not deferred to the next login.  
**Source:** USER_DECISION (Q6)

### BR-006 — Post-MVP: Strike Monetary Penalty
When online payment is enabled (post-MVP), each strike acquired via post-assignment cancellation will carry a monetary penalty charged to the rider. This rule is **not active in the MVP**.  
**Source:** USER_DECISION (Q6 — forward-looking decision)

---

## Service Request

### BR-007 — Authentication Required to Request
A user must be authenticated to submit a service request. Unauthenticated users may browse the app and view estimated prices but cannot submit.  
**Source:** USER_DECISION (Q7)

### BR-008 — All Request Fields Are Mandatory
A service request cannot be submitted without: pickup location, destination, and selected vehicle.  
**Source:** DOCUMENT / USER_DECISION

### BR-009 — Pickup and Destination Must Be Different
Pickup location and destination must not be the same coordinates or address.  
**Source:** AI_RECOMMENDATION (logical constraint)

### BR-010 — Preliminary Estimate Requires an Online Driver
The preliminary price estimate at request time uses the nearest online driver's GPS location. If no driver is online, the estimate cannot be calculated using the standard 3-component method.  
**Source:** USER_DECISION (Q25 — Option C)  
**See:** OPEN_QUESTIONS.md OQ-001 for handling when no driver is online.

### BR-011 — Final Price Uses Assigned Driver's Location
The final service price is calculated using the assigned driver's actual GPS location at the time of assignment.  
**Source:** USER_DECISION (Q11 — Option C)

### BR-012 — Price Calculation Has Three Components
The total service price = (driver → pickup leg × price/km) + (pickup → destination leg × price/km) + (destination → driver leg × price/km).  
**Source:** USER_DECISION (Q9)

### BR-013 — Historical Prices Are Immutable
Once a final price is calculated and stored on a completed service, it is not recalculated even if the per-km rate changes.  
**Source:** USER_DECISION (FR-024 AC-024-3)

---

## Status Transitions

### BR-014 — Status Must Follow Defined Order
Service status transitions must follow this sequence only:  
`Requested → Assigned → En Route → In Progress → Completed`  
or  
`Requested → Cancelled` (free)  
`Assigned → Cancelled` (with strike)  
No other transitions are permitted.  
**Source:** DOCUMENT / USER_DECISION (Q6)

### BR-015 — Only Defined Actors Can Trigger Transitions

| Transition | Actor |
|---|---|
| → Requested | Rider |
| → Assigned | Operator or Super-Admin |
| → En Route | Driver |
| → In Progress | Driver |
| → Completed | Driver |
| → Cancelled (from Requested) | Rider |
| → Cancelled (from Assigned) | Rider or Operator |

**Source:** USER_DECISION (interview)

### BR-016 — Completed Services Are Terminal
A service in "Completed" status cannot change status.  
**Source:** USER_DECISION

### BR-017 — Driver Cannot Go Offline During Active Service
A driver with an active assignment (status En Route or In Progress) cannot toggle their availability to offline.  
**Source:** USER_DECISION (FR-017 AC-017-3)

---

## Driver Assignment

### BR-018 — Only Available Drivers Can Be Assigned
Only drivers with availability status "online" and no current active assignment can be assigned to a new request.  
**Source:** USER_DECISION (Q14, FR-022)

### BR-019 — Only Active Drivers Can Be Assigned
Deactivated driver profiles cannot be assigned to any request.  
**Source:** USER_DECISION (FR-023)

---

## Vehicle

### BR-020 — Vehicle Must Have All Required Fields
A vehicle record requires: license plate, make/model, and color. All three fields are mandatory.  
**Source:** USER_DECISION (Q23)

### BR-021 — Unique License Plate Per Rider
A rider cannot save two vehicles with the same license plate in their profile.  
**Source:** USER_DECISION (FR-005 AC-005-2)

---

## Pricing

### BR-022 — Price Per Km Is Globally Configured
A single per-km rate applies to all 3 legs of all service calculations. Configured by Super-Admin.  
**Source:** USER_DECISION (Q9, FR-024)

### BR-023 — Rate Changes Apply to Future Requests Only
Changing the per-km rate does not retroactively affect historical or in-progress service prices.  
**Source:** USER_DECISION (FR-024 AC-024-3)

---

## Rating

### BR-024 — Mutual Rating After Completion
After a service reaches "Completed" status, both the rider and the driver are prompted to rate each other.  
**Source:** USER_DECISION (Q13)

### BR-025 — Rating Is 1–5 Stars
Ratings must be an integer between 1 and 5 inclusive. Comments are optional.  
**Source:** USER_DECISION (Q13, FR-018)

### BR-026 — One Rating Per Party Per Service
Each party (rider, driver) can submit at most one rating per completed service.  
**Source:** USER_DECISION (FR-018 AC-018-3)

### BR-027 — Driver Rating Is the Rolling Average
A driver's displayed rating is the arithmetic average of all ratings received across all completed services.  
**Source:** USER_DECISION (Q13, FR-018 AC-018-4)

---

## Admin Roles

### BR-028 — Two Admin Roles With Distinct Permissions

| Permission | Operator | Super-Admin |
|---|---|---|
| View requests | ✅ | ✅ |
| Assign drivers | ✅ | ✅ |
| Cancel requests | ✅ | ✅ |
| Manage driver profiles | ❌ | ✅ |
| Configure pricing | ❌ | ✅ |
| View analytics dashboard | ❌ | ✅ |
| Manage admin users | ❌ | ✅ |

**Source:** USER_DECISION (Q14 — Option B)

---

## Cancellation — Operator Rules

### BR-030 — Operator-Initiated Cancellation Does Not Penalise Rider
When an **Operator** cancels a service from "Assigned" status, the rider receives no strike. The system sends an apology notification to the rider and pre-fills the request form with the cancelled service's pickup, destination, and vehicle so the rider can re-request with one tap.
**Source:** USER_DECISION (OQ-004)

---

## Geography

### BR-029 — MVP Coverage Is CABA + AMBA
The service is available within Ciudad Autónoma de Buenos Aires and Área Metropolitana de Buenos Aires (GBA) from day one of the MVP.  
**Source:** USER_DECISION (Q8)
