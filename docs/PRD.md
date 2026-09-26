# PRD — Regreso Seguro

**Version:** 1.0  
**Status:** Approved for MVP  
**Last updated:** 2026-09-25  
**Owner:** Ignacio Caprara (PM)  

---

## 1. Product Vision

Regreso Seguro is a nighttime vehicular accompaniment service that allows people who have consumed alcohol at a social event to return home safely **together with their own car**. A validated professional driver comes to the user's location, drives the user's car, and the user arrives home with their vehicle — eliminating the choice between personal safety and leaving the car behind.

---

## 2. Problem Statement

After consuming alcohol, a person faces two simultaneous problems:

1. **Personal transport:** Cannot drive safely or legally.
2. **Vehicle transport:** The car is left behind, exposed to theft, fines, or the inconvenience of a next-day retrieval trip.

Existing alternatives (Uber, taxi, remis) solve only problem 1. No simple service exists in CABA/AMBA that solves both simultaneously.

### Validated Evidence

- 375-response quantitative survey conducted in CABA/AMBA
- 56.3% of respondents are in the affected segment
- 81% expressed interest in this type of service
- 80.1% left their car parked at least once in the last 12 months due to drinking
- 77.3% avoided attending an event because of the difficulty of returning with their car
- Target segment: adults 25–44 years old, CABA/AMBA residents, car owners

---

## 3. MVP Objective

Validate that a real, monetizable demand exists for this service by operating a functional end-to-end version that:

- Allows users to request a "Regreso Seguro" (pickup location, destination, vehicle info)
- Enables the operations team to manually assign a validated driver
- Provides real-time status tracking for users and drivers
- Collects post-service satisfaction data
- Generates basic operational analytics

The MVP is **not** intended to be the final product — it is a validation instrument.

---

## 4. Success Metrics

| Metric | What it measures |
|---|---|
| **Demand** | Number of service requests; % of users who complete a request |
| **Conversion** | % of requests converted into completed services |
| **Experience** | Post-service CSAT/NPS; incident and cancellation rate |
| **Retention** | % of users who return within the pilot period |

---

## 5. Target Users

### Primary User — Rider
- **Profile:** Adults 25–44 years old, CABA/AMBA resident, owns or regularly uses a car, goes out socially and consumes alcohol
- **Persona:** Nicolás González, 31 years old, CABA, employed, lives with partner, no children
- **Core need:** "I want to get home safely and find my car where I left it."

### Secondary User — Driver
- **Profile:** Validated professional driver registered in the platform
- **Need:** Receive assigned jobs, navigate to pickup, update service status

### Internal Users — Operations
- **Operator:** Assigns drivers to pending requests, manages active services
- **Super-Admin:** Manages driver profiles, configures pricing, views analytics

---

## 6. MVP Scope

### Included

| Feature | Description |
|---|---|
| User registration & authentication | Email + password via Supabase Auth |
| Guest browsing | Unauthenticated users can browse the app and see estimated cost; login required to request |
| Vehicle management | Riders save vehicles to their profile; reuse or create new at request time |
| Service request | Enter pickup location, destination, select vehicle; see 3-component estimated price |
| Driver assignment | Operator selects from registered drivers and assigns to a request |
| Status tracking | 5 states: Requested → Assigned → En Route → In Progress → Completed |
| Real-time updates | Supabase Realtime pushes status changes to all parties |
| Driver interface | Drivers see their assigned jobs and update status themselves |
| Mutual rating | Rider and driver rate each other after service completion |
| Cancellation with strike system | Riders can cancel freely while "Requested"; cancellation after "Assigned" adds 1 strike; 3 strikes = account suspended |
| Service history | Riders can view their past services |
| Admin panel | Request list, driver assignment, driver management, pricing config, basic analytics |
| Push notifications | PWA Web Push when status changes |
| Email notifications | Transactional emails via Resend (registration confirmation, service updates) |

### Out of Scope (MVP)

| Feature | Reason |
|---|---|
| Automated driver matching/routing optimization | Post-MVP |
| Integrated payments (Mercado Pago, Stripe, etc.) | Post-MVP; manual/cash for now |
| Real-time GPS tracking on map | Post-MVP |
| Loyalty, promotions, advanced ratings | Post-MVP |
| Strike monetary penalty | Post-MVP (planned when payment integration ships) |
| Native iOS/Android apps | Post-MVP; PWA covers MVP |

---

## 7. Deployment Context

- **Platform:** Progressive Web App (PWA), mobile-first, installable on any device
- **Geographic scope:** CABA (Ciudad Autónoma de Buenos Aires) + AMBA (Área Metropolitana de Buenos Aires / GBA / Gran Buenos Aires), Argentina
- **Timeline:** MVP launch target October 30, 2026
- **Launch strategy:** Closed beta with known users; expand based on signals

---

## 8. Constraints

| Constraint | Detail |
|---|---|
| **Zero cost** | All APIs, services, and infrastructure must be free or open-source with no usage costs |
| **Small team** | 5 people, academic context, limited bandwidth |
| **Timeline** | MVP must be operational by October 30, 2026 |
| **No payment processing** | No financial transactions in the app for MVP |

---

## 9. Post-MVP Roadmap (documented, not in scope)

1. Strike monetary penalty when payment integration ships
2. Integrated payments (Mercado Pago)
3. Automated driver matching
4. Real-time GPS tracking
5. Native mobile apps
6. Loyalty and promotions
