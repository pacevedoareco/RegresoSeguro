# DATA_MODEL — Regreso Seguro

**Version:** 1.0  
**Status:** Approved for MVP  
**Last updated:** 2026-09-25  
**Database:** PostgreSQL 15 (via Supabase)

---

## Entity Overview

```
profiles (1) ──────< vehicles (many)
profiles (1) ──────< services (many, as rider)
profiles (1) ──────< services (many, as driver)
services (1) ──────< service_status_log (many)
services (1) ──────> ratings (2: one per party)
drivers (1) ─────── profiles (1:1, when role = driver)
pricing_config (singleton table)
push_subscriptions (many) >────── profiles (1)
```

---

## Tables

---

### `profiles`

Extends Supabase Auth `auth.users`. One row per user (rider, driver, operator, super_admin).

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | FK → `auth.users.id` (PK) |
| `role` | `enum` | ✅ | `rider` \| `driver` \| `operator` \| `super_admin` |
| `full_name` | `text` | ✅ | Display name |
| `phone` | `text` | ❌ | Optional at registration; required for drivers |
| `registered_as_driver` | `boolean` | ✅ | Default `false`. Set to `true` when user registers via `/driver/register`. Used to identify pending driver applications. |
| `strikes` | `integer` | ✅ | Default `0`. Rider only — ignored for other roles |
| `is_suspended` | `boolean` | ✅ | Default `false`. Derived from `strikes >= 3` but stored for fast check |
| `average_rating` | `numeric(3,2)` | ❌ | Rolling average; null until first rating received |
| `rating_count` | `integer` | ✅ | Default `0`. Number of ratings received |
| `created_at` | `timestamptz` | ✅ | Default `now()` |
| `updated_at` | `timestamptz` | ✅ | Updated on every change |

**Lifecycle:** Created automatically when a user registers via Supabase Auth trigger.  
**Relationships:** 1:1 with `auth.users`; 1:N with `vehicles`; 1:N with `services` (as rider); 1:1 with `driver_profiles` (if role = driver).  
**Security:** RLS — users can read and update their own profile; admins can read all profiles; only super_admin can update roles.

**Business rules enforced:**
- BR-002: `is_suspended = true` when `strikes >= 3`
- BR-005: Suspension is immediate — trigger updates `is_suspended` when `strikes` reaches 3
- PD-022: `registered_as_driver = true` marks the account as a pending driver application for Super-Admin promotion

---

### `driver_profiles`

Extended information for users with role = driver. Separate from `profiles` to avoid cluttering the rider profile table.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | FK → `profiles.id` (PK) |
| `dni` | `text` | ✅ | National ID number (DNI) |
| `license_number` | `text` | ✅ | Driver's license number |
| `license_category` | `text` | ✅ | e.g., "B1", "C1" |
| `availability` | `enum` | ✅ | `online` \| `offline`. Default `offline` |
| `current_lat` | `numeric(10,7)` | ❌ | Null when offline |
| `current_lng` | `numeric(10,7)` | ❌ | Null when offline |
| `location_updated_at` | `timestamptz` | ❌ | Timestamp of last GPS update |
| `is_active` | `boolean` | ✅ | Default `true`. Inactive = deactivated by admin |
| `created_at` | `timestamptz` | ✅ | Default `now()` |
| `updated_at` | `timestamptz` | ✅ | |

**Lifecycle:** Created by Super-Admin when registering a new driver.  
**Relationships:** 1:1 with `profiles`.  
**Security:** Drivers can update their own availability and GPS location; Super-Admin can manage all fields; Operators can read (for assignment); GPS coordinates accessible to operators only (not to riders).

**State transitions for `availability`:**
- `offline → online`: driver goes available; GPS tracking begins
- `online → offline`: driver becomes unavailable; GPS cleared; only allowed if no active service (BR-017)

**Business rules enforced:**  
- BR-017: Cannot go offline during active service  
- BR-018: Only `online`, `is_active = true` drivers appear in assignment list  
- BR-019: `is_active = false` drivers excluded from assignment

---

### `vehicles`

Vehicles saved to a rider's profile.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | PK, generated |
| `rider_id` | `uuid` | ✅ | FK → `profiles.id` |
| `license_plate` | `text` | ✅ | Uppercase normalized |
| `make_model` | `text` | ✅ | e.g., "Toyota Corolla" |
| `color` | `text` | ✅ | e.g., "Rojo" |
| `is_active` | `boolean` | ✅ | Default `true`. Soft delete |
| `created_at` | `timestamptz` | ✅ | |

**Lifecycle:** Created by rider; soft-deleted when removed.  
**Validation:**  
- `license_plate` unique per `rider_id` (BR-021)  
- All 3 text fields non-empty (BR-020)  
**Security:** RLS — riders can only read and manage their own vehicles.

---

### `services`

Core entity. One row per service request.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | PK, generated |
| `rider_id` | `uuid` | ✅ | FK → `profiles.id` |
| `driver_id` | `uuid` | ❌ | FK → `profiles.id`; null until assigned |
| `vehicle_id` | `uuid` | ✅ | FK → `vehicles.id` |
| `status` | `enum` | ✅ | `requested` \| `assigned` \| `en_route` \| `in_progress` \| `completed` \| `cancelled` |
| `pickup_address` | `text` | ✅ | Human-readable address |
| `pickup_lat` | `numeric(10,7)` | ✅ | |
| `pickup_lng` | `numeric(10,7)` | ✅ | |
| `destination_address` | `text` | ✅ | Human-readable address |
| `destination_lat` | `numeric(10,7)` | ✅ | |
| `destination_lng` | `numeric(10,7)` | ✅ | |
| `estimated_price` | `numeric(10,2)` | ❌ | Preliminary estimate shown at request time |
| `estimated_pickup_km` | `numeric(8,3)` | ❌ | Leg 1 distance used for estimate |
| `estimated_ride_km` | `numeric(8,3)` | ❌ | Leg 2 distance used for estimate |
| `estimated_return_km` | `numeric(8,3)` | ❌ | Leg 3 distance used for estimate |
| `final_price` | `numeric(10,2)` | ❌ | Set after driver assignment; null until then |
| `final_pickup_km` | `numeric(8,3)` | ❌ | Leg 1 distance after assignment |
| `final_ride_km` | `numeric(8,3)` | ❌ | Leg 2 distance after assignment |
| `final_return_km` | `numeric(8,3)` | ❌ | Leg 3 distance after assignment |
| `price_per_km_at_time` | `numeric(8,2)` | ❌ | Snapshot of per-km rate at assignment time (BR-013) |
| `cancellation_reason` | `text` | ❌ | Set if cancelled |
| `cancelled_by` | `uuid` | ❌ | FK → `profiles.id`; who cancelled |
| `requested_at` | `timestamptz` | ✅ | Default `now()` |
| `assigned_at` | `timestamptz` | ❌ | Set on assignment |
| `completed_at` | `timestamptz` | ❌ | Set on completion |
| `cancelled_at` | `timestamptz` | ❌ | Set on cancellation |

**State machine:**  
`requested` → `assigned` → `en_route` → `in_progress` → `completed`  
`requested` → `cancelled` (no strike)  
`assigned` → `cancelled` (strike to rider if rider cancelled)

**Lifecycle:**
1. Created by rider with status `requested`
2. Operator assigns driver → status `assigned`, `final_price` calculated
3. Driver advances through `en_route` → `in_progress` → `completed`

**Security:** RLS — riders see only their own services; drivers see only their assigned services; operators/admins see all.

**Business rules enforced:**  
- BR-001: Checked before insert — rider cannot have another non-terminal service  
- BR-011, BR-012, BR-013: Price calculation and immutability  
- BR-014, BR-015: Status transitions enforced in API routes

---

### `service_status_log`

Immutable audit log of every status change.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | PK |
| `service_id` | `uuid` | ✅ | FK → `services.id` |
| `from_status` | `enum` | ❌ | Null for initial creation |
| `to_status` | `enum` | ✅ | |
| `changed_by` | `uuid` | ✅ | FK → `profiles.id` |
| `changed_at` | `timestamptz` | ✅ | Default `now()` |
| `notes` | `text` | ❌ | Optional context |

**Lifecycle:** Append-only. Rows are never updated or deleted.  
**Security:** RLS — operators and admins can read all; riders and drivers can read their own service logs.

---

### `ratings`

Post-service ratings. Two rows per completed service (one from rider, one from driver).

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | PK |
| `service_id` | `uuid` | ✅ | FK → `services.id` |
| `rater_id` | `uuid` | ✅ | FK → `profiles.id` (who submitted the rating) |
| `ratee_id` | `uuid` | ✅ | FK → `profiles.id` (who was rated) |
| `stars` | `smallint` | ✅ | 1–5 inclusive |
| `comment` | `text` | ❌ | Optional |
| `created_at` | `timestamptz` | ✅ | Default `now()` |

**Constraint:** Unique on (`service_id`, `rater_id`) — one rating per rater per service (BR-026).  
**Trigger:** After insert, update `profiles.average_rating` and `profiles.rating_count` for the `ratee_id`.

**Security:** RLS — users can insert ratings for their own completed services; read access to own ratings; admins can read all.

---

### `pricing_config`

Singleton table — always exactly one row.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `integer` | ✅ | Always `1` (singleton) |
| `price_per_km` | `numeric(8,2)` | ✅ | ARS per kilometer |
| `updated_by` | `uuid` | ✅ | FK → `profiles.id` (last Super-Admin to update) |
| `updated_at` | `timestamptz` | ✅ | |

**Security:** RLS — Super-Admin only for write; readable by service (API routes) via service role key.

---

### `push_subscriptions`

Stores Web Push API subscription objects per user/device.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `uuid` | ✅ | PK |
| `user_id` | `uuid` | ✅ | FK → `profiles.id` |
| `endpoint` | `text` | ✅ | Push subscription endpoint URL |
| `p256dh` | `text` | ✅ | Encryption key |
| `auth` | `text` | ✅ | Auth secret |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | |

**Lifecycle:** Created/updated when user grants push permission; deleted when subscription expires or user revokes permission.  
**Security:** RLS — users manage only their own subscriptions; server-side push uses service role key.

---

## Enums

```sql
CREATE TYPE user_role AS ENUM ('rider', 'driver', 'operator', 'super_admin');
CREATE TYPE driver_availability AS ENUM ('online', 'offline');
CREATE TYPE service_status AS ENUM (
  'requested', 'assigned', 'en_route', 'in_progress', 'completed', 'cancelled'
);
```

---

## Key Indexes

```sql
-- Fast lookup of active services per rider (BR-001 check)
CREATE INDEX idx_services_rider_active ON services(rider_id, status)
  WHERE status NOT IN ('completed', 'cancelled');

-- Fast lookup of pending services for admin panel
CREATE INDEX idx_services_status ON services(status, requested_at DESC);

-- Fast lookup of online drivers for assignment and price estimation
CREATE INDEX idx_driver_profiles_online ON driver_profiles(availability, is_active)
  WHERE availability = 'online' AND is_active = true;
```

---

## Row Level Security Policy Summary

| Table | Policy | Who |
|---|---|---|
| `profiles` | SELECT own row | Authenticated user |
| `profiles` | UPDATE own row | Authenticated user (limited columns) |
| `profiles` | SELECT all | Operator, Super-Admin |
| `driver_profiles` | SELECT + UPDATE own | Driver |
| `driver_profiles` | SELECT all | Operator, Super-Admin |
| `driver_profiles` | INSERT + UPDATE + DELETE | Super-Admin |
| `vehicles` | All operations own rows | Rider |
| `services` | SELECT own (rider or driver) | Rider, Driver |
| `services` | SELECT all | Operator, Super-Admin |
| `services` | INSERT | Rider (via API route) |
| `services` | UPDATE status | API routes (service role) |
| `service_status_log` | SELECT | All authenticated |
| `service_status_log` | INSERT | API routes (service role) |
| `ratings` | INSERT own | Rider, Driver (own service) |
| `ratings` | SELECT | All authenticated |
| `pricing_config` | SELECT | All authenticated |
| `pricing_config` | UPDATE | Super-Admin |
| `push_subscriptions` | All on own rows | Authenticated user |
