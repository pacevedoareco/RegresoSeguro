# USER_FLOWS — Regreso Seguro

**Version:** 1.0  
**Status:** Approved for MVP  
**Last updated:** 2026-09-25  

---

## UF-001 — Guest Browsing

**Purpose:** Allow unauthenticated users to explore the app and understand the service before committing to registration.

**Entry points:** Direct URL, social media link, referral

**User actions:**
- Opens the app
- Sees the map view (OpenStreetMap) with the city
- Can interact with the request form (enter locations, see estimated price)
- Cannot submit the request

**System behavior:**
- App loads without requiring authentication
- Map renders OpenStreetMap tiles
- Request form is visible and usable up to submission step
- Estimated price is shown (if at least one driver is online)

**States:**
- *Loading:* Skeleton or spinner while map tiles load
- *Active:* Map + request form available
- *Error:* Map tiles fail to load — show error banner, form still usable

**Navigation:** "Request Service" button → triggers auth gate (UF-002)

**Mobile behavior:** Full-screen map, pull-up sheet for request form

---

## UF-002 — Registration

**Purpose:** Create a new rider account.

**Entry points:** Auth gate intercept during request; direct link to /register

**User actions:**
1. Enter email address
2. Enter password (min 8 characters)
3. Submit form

**System behavior:**
1. Validates email format and password length
2. Checks email is not already registered
3. Creates account via Supabase Auth
4. Sends confirmation email via Resend
5. Shows success state with "check your email" message

**States:**
- *Loading:* Submit button shows spinner, form disabled
- *Success:* "Check your email to confirm your account" message
- *Error — duplicate email:* "This email is already registered. Log in instead."
- *Error — weak password:* "Password must be at least 8 characters."
- *Error — invalid email:* "Please enter a valid email address."
- *Error — network:* "Something went wrong. Please try again."

**Post-registration flow:** User confirms email → can log in → if coming from auth gate, returns to request flow with previously entered data preserved

**Mobile behavior:** Standard form, keyboard-aware scrolling

---

## UF-003 — Login

**Purpose:** Authenticate an existing rider or driver/admin.

**Entry points:** Auth gate intercept; /login direct; post-registration confirmation

**User actions:**
1. Enter email and password
2. Submit

**System behavior:**
1. Validates credentials via Supabase Auth
2. Checks account status (suspended, active, unconfirmed)
3. On success: establishes session, routes to appropriate home screen based on role (rider home / driver home / admin panel)

**States:**
- *Loading:* Spinner on submit
- *Success:* Redirect to home
- *Error — invalid credentials:* "Email or password is incorrect." (no field-specific hint)
- *Error — unconfirmed account:* "Please confirm your email before logging in."
- *Error — suspended account:* "Your account has been suspended. [Reason]"

**Mobile behavior:** Standard form, password visibility toggle

---

## UF-004 — Rider: Request a Service

**Purpose:** Main rider journey — submit a new service request.

**Entry points:** Home screen "Request Service" CTA; auth gate return

**Preconditions:** Rider is authenticated, account not suspended, no active service

**Steps:**

1. **Select pickup location**
   - Default: device GPS location (with permission prompt if not granted)
   - User can adjust by moving map pin or typing address (geocoding via OpenRouteService)
   - Confirm pickup

2. **Select destination**
   - User types or picks on map
   - Confirm destination

3. **Select or add vehicle**
   - If saved vehicles exist: show list, pre-select first vehicle; option to "Use a different vehicle"
   - If no saved vehicles: show add vehicle form (license plate, make/model, color)
   - New vehicle is saved to profile

4. **Review & confirm**
   - Summary: pickup address, destination address, vehicle, estimated price (3-component breakdown)
   - "Confirm Request" button

5. **Request submitted**
   - Status screen appears: "Your request is confirmed. Waiting for a driver to be assigned."
   - Real-time status bar visible

**System behavior at Step 4:**
- Calculates preliminary price using nearest online driver
- Displays 3 components: pickup leg, ride leg, return leg + total

**States:**
- *Loading (Step 4):* "Calculating estimate..." spinner
- *No drivers online:* Show fallback message (see OQ-001)
- *Success:* Request created, status screen
- *Error — active request exists:* "You already have an active service request."
- *Error — suspended:* "Your account is suspended and cannot place requests."

**Mobile behavior:** Step-by-step wizard (bottom sheet or full screen per step), map prominent throughout

---

## UF-005 — Rider: Track Service Status

**Purpose:** Allow the rider to follow the progress of their active service in real-time.

**Entry points:** Home screen (if active service exists); status screen after request submission; push notification tap

**User actions:**
- View current status
- Contact driver (phone number shown — tap to call)
- Cancel (if status is Requested or Assigned — with appropriate warning)

**System behavior:**
- Supabase Realtime subscription keeps status current
- When status = Assigned: show driver name, phone, vehicle, confirmed price
- When status = En Route: "Your driver is on the way" message
- When status = In Progress: "Service in progress" message
- When status = Completed: trigger rating prompt (UF-008)

**States:**
- *Requested:* Waiting animation, cancel option (free)
- *Assigned:* Driver info shown, cancel option (with strike warning)
- *En Route:* "Driver is on the way" — no cancel
- *In Progress:* "Service in progress" — no cancel
- *Completed:* → Rating flow (UF-008)
- *Cancelled:* Show reason; option to create new request

**Mobile behavior:** Full-screen status view, status progress bar at top

---

## UF-006 — Rider: Cancel Service

**Purpose:** Allow rider to cancel their active request, with appropriate consequences.

**Entry points:** Status screen cancel button (visible in Requested and Assigned states only)

**Cancellation from "Requested" status:**
1. Rider taps "Cancel"
2. Confirmation dialog: "Are you sure you want to cancel? No penalty applies."
3. Rider confirms → status → Cancelled → no strike

**Cancellation from "Assigned" status:**
1. Rider taps "Cancel"
2. Warning dialog: "Cancelling now will add 1 strike to your account. You currently have X/3 strikes. Continue?"
3. Rider confirms → status → Cancelled → +1 strike
4. If strikes = 3: suspension notice shown; account suspended

**States:**
- *Confirmation dialog:* Clearly shows consequence
- *Processing:* Spinner while saving
- *Success:* Status screen shows "Cancelled"; rider can start a new request (if not suspended)
- *Suspended:* Suspension notice with explanation

---

## UF-007 — Rider: View Service History

**Purpose:** Allow rider to review past services.

**Entry points:** Profile menu → "My trips"

**User actions:**
- Scroll list of past services
- Tap a service to see details

**System behavior:** Loads services ordered by date desc; shows date, status, pickup/destination addresses, vehicle, price, rating given

**States:**
- *Loading:* Skeleton list
- *Empty:* "You haven't taken any trips yet."
- *Populated:* List with per-item summary
- *Detail view:* Full service info including ratings

---

## UF-008 — Mutual Rating

**Purpose:** Capture post-service feedback from both rider and driver.

**Entry points:** Automatic trigger when service status changes to "Completed"

**User actions (rider):**
1. Rating screen appears
2. Select 1–5 stars for the service/driver
3. Optionally type a comment
4. Submit (or dismiss)

**User actions (driver):** Same flow, rating the rider.

**System behavior:**
- Rating screen appears on top of current view for both parties simultaneously
- Rating stored linked to the service and both users
- Driver's average rating updated
- Rider's average rating updated

**States:**
- *Pending:* Star selector + optional comment field + submit button
- *Submitted:* "Thank you for your feedback" message, screen dismissed
- *Dismissed:* No rating recorded; marked as skipped
- *Already rated:* Screen does not appear again

---

## UF-009 — Driver: Home & Job Management

**Purpose:** Allow the driver to manage their availability and view their current assignment.

**Entry points:** Driver login

**User actions:**
- Toggle availability online/offline
- View current assignment details
- Navigate to pickup (deep link to external maps app)
- Update service status

**States:**
- *Offline:* Toggle shown as offline; no job shown
- *Online, no assignment:* "Awaiting assignment" state with spinner or idle indicator
- *Assigned — not started:* Job card with rider info, pickup, destination, price; "Start" button (→ En Route)
- *En Route:* "I've arrived" button (→ In Progress)
- *In Progress:* "Complete service" button (→ Completed)
- *Completed:* → Rating flow (UF-008)

**Mobile behavior:** Single primary screen, large status action button

---

## UF-010 — Operator: Assign Driver to Request

**Purpose:** Allow operator to see pending requests and assign a driver.

**Entry points:** Admin panel → Requests view

**User actions:**
1. View list of requests in "Requested" status
2. Select a request
3. View request details (rider, pickup, destination, vehicle)
4. Select an available driver from the driver list
5. Confirm assignment

**System behavior:**
1. Validates driver is online and unassigned
2. Calculates final price using assigned driver's GPS location
3. Updates request status to "Assigned"
4. Stores final price on the request
5. Broadcasts via Realtime to rider and driver
6. Sends push notification to rider

**States:**
- *No pending requests:* "No requests awaiting assignment" empty state
- *Processing:* Spinner on confirm
- *Success:* Request moves from pending list to active list
- *Error — driver offline:* "This driver is no longer available."

---

## UF-011 — Super-Admin: Configure Pricing

**Purpose:** Allow Super-Admin to set or update the per-km rate.

**Entry points:** Admin panel → Pricing

**User actions:**
1. View current per-km rate
2. Edit the value
3. Save

**System behavior:**
- Validates rate is a positive number
- Saves new rate
- New rate applies to all subsequent price calculations immediately

**States:**
- *View:* Current rate displayed
- *Edit:* Inline edit with save/cancel
- *Success:* "Price updated successfully"
- *Error — invalid value:* "Rate must be a positive number"

---

## UF-012 — Super-Admin: Manage Drivers

**Purpose:** Create, view, edit, and deactivate driver profiles.

**Entry points:** Admin panel → Drivers

**User actions:**
- View driver list
- Create new driver
- Edit driver details
- Toggle driver active/inactive

**System behavior:**
- Driver list shows name, phone, license, availability, rating, active status
- Create driver form requires: full name, DNI, phone, license number, license category
- Deactivated drivers cannot be assigned

**States:**
- *Empty list:* "No drivers registered yet."
- *Create form:* Validation on all required fields
- *Deactivate confirmation:* "Are you sure? This driver will no longer be assignable."
