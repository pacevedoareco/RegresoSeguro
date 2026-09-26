# ADR — Architecture Decision Records

**Project:** Regreso Seguro  
**Version:** 1.0  
**Last updated:** 2026-09-25  

---

## ADR-001 — Deploy as Progressive Web App (PWA)

**Status:** Accepted

**Context**  
The product needs to be accessible on mobile devices (primary use case: requesting a service from a bar or event). The team is small with no native mobile development experience. The target audience uses both Android and iOS.

**Options considered**
1. Native Android + iOS apps (React Native or separate codebases)
2. PWA (Progressive Web App)
3. Web-only (no mobile support)

**Decision**  
Deploy as a PWA that runs in the browser and is installable on any device.

**Rationale**  
- Single codebase covers all platforms
- Zero deployment cost (no App Store fees or review processes)
- Fast to iterate — no store submission per release
- Modern browsers fully support PWA features needed for MVP (push notifications, offline, home screen install)
- Aligns with D-001 from the original project document

**Consequences**  
- Some PWA limitations vs native: deeper OS integration, performance on older devices
- iOS PWA push notifications require iOS 16.4+ (noted risk)
- Architecture must be mobile-first from the start

**Alternatives rejected**  
- Native apps: too costly (time and money) for an academic MVP with a 5-person team
- Web-only: primary users are on mobile, ignoring mobile would undermine usability

---

## ADR-002 — Next.js as Full-Stack Framework

**Status:** Accepted

**Context**  
The team needs a React framework to build the PWA. The backend also needs an API layer. The zero-cost constraint limits deployment options.

**Options considered**
1. Next.js (React + API routes in one project) on Vercel
2. Vite/React (frontend only) + separate Express/Fastify backend
3. Remix (full-stack React)

**Decision**  
Use **Next.js 14+ (App Router)** as the full-stack framework, deployed on Vercel free tier.

**Rationale**  
- Single repository, single deployment — lower operational complexity
- API routes replace the need for a separate backend process
- Vercel free tier is purpose-built for Next.js — zero config, zero cost
- App Router enables React Server Components for simpler data fetching
- Team frontend role has React experience
- Excellent PWA support via `next-pwa`
- Preview deployments on pull requests out of the box

**Consequences**  
- API routes are serverless functions — stateless, no persistent connections possible directly (Supabase Realtime handles the real-time layer)
- Cold start latency on serverless functions (acceptable for MVP)
- Must be careful not to put secrets in client bundle (enforced via environment variable naming convention)

**Alternatives rejected**  
- Separate frontend + backend: doubles deployment complexity with no benefit for MVP scale
- Remix: smaller ecosystem, team less familiar

---

## ADR-003 — Supabase as Backend-as-a-Service

**Status:** Accepted

**Context**  
The project needs PostgreSQL, authentication, real-time subscriptions, and file storage. The team is small, zero cost is required, and operational complexity must be minimal.

**Options considered**
1. Supabase (PostgreSQL + Auth + Realtime + Storage)
2. Firebase (Firestore + Firebase Auth + FCM)
3. Self-hosted PostgreSQL + custom auth + WebSocket server

**Decision**  
Use **Supabase** as the primary backend service (database, auth, realtime, storage).

**Rationale**  
- Free tier covers MVP scale (500MB DB, 50k MAU, 2GB bandwidth)
- PostgreSQL is relational — well-suited to the structured data model (services, users, drivers, prices)
- Built-in Supabase Auth handles email+password with session management
- Supabase Realtime provides WebSocket-based live updates without a custom server
- Row Level Security enforces authorization at the database level
- One account already registered — no onboarding cost

**Consequences**  
- Locked into Supabase's API patterns for DB and auth
- Supabase free tier has project pause after 1 week of inactivity (acceptable for MVP — can be kept active)
- RLS policies must be carefully written; incorrect policies are a security risk

**Alternatives rejected**  
- Firebase: Firestore is a document database — less natural for relational data; pricing is more complex; real-time model is different
- Self-hosted: too much operational overhead for a 5-person academic team

---

## ADR-004 — TypeScript Throughout

**Status:** Accepted

**Context**  
The project needs a reliable, maintainable codebase. The team includes developers with varying experience levels. Type safety reduces runtime errors and improves IDE support.

**Options considered**
1. TypeScript (typed JavaScript)
2. Plain JavaScript

**Decision**  
Use **TypeScript** for all code (Next.js app, API routes, database types).

**Rationale**  
- Supabase CLI can auto-generate TypeScript types from the database schema
- Catches bugs at compile time — critical for a small team with no QA process at code review time
- Next.js has first-class TypeScript support
- Zod schemas for runtime validation compose well with TypeScript types

**Consequences**  
- Minor overhead in writing type definitions
- Compile step required (handled by Next.js build)

**Alternatives rejected**  
- Plain JavaScript: higher risk of runtime errors, worse IDE support, no benefit for MVP

---

## ADR-005 — OpenRouteService for Routing and Distance

**Status:** Accepted

**Context**  
The pricing model requires calculating the distance of 3 route legs. The zero-cost constraint eliminates Google Maps Platform and Mapbox (both paid at meaningful scale). OSRM was initially proposed but requires self-hosting.

**Options considered**
1. OSRM (self-hosted) — free, full control, requires server + Argentina map data
2. OpenRouteService (hosted, free tier: 2,000 requests/day)
3. Google Maps Distance Matrix API (paid after free tier)
4. Mapbox Directions API (paid after free tier)

**Decision**  
Use **OpenRouteService (ORS)** free tier for distance calculation and geocoding.

**Rationale**  
- 2,000 requests/day is more than sufficient for MVP beta scale
- No infrastructure to manage (no self-hosted server needed)
- Supports Argentina road network via OpenStreetMap data
- Free API key — zero cost
- Can self-host OSRM in the future if traffic grows beyond free tier

**Consequences**  
- Hard dependency on ORS availability (mitigated by error handling)
- 2,000 req/day limit — if beta exceeds this, requests will fail (must monitor)
- API key must be server-side only (routed through Next.js API routes)

**Alternatives rejected**  
- OSRM self-hosted: requires a VPS with sufficient RAM/disk to process Argentina OSM data; too complex for MVP given team size
- Google Maps / Mapbox: paid beyond small free tiers; violates zero-cost constraint

---

## ADR-006 — Tailwind CSS for Styling

**Status:** Accepted (AI Recommendation — approved by implication of stack selection)

**Context**  
The app needs to be mobile-first and visually consistent. The team has a UX designer (Jordan) but no dedicated CSS architect. The PWA needs responsive design.

**Options considered**
1. Tailwind CSS (utility-first)
2. CSS Modules (scoped CSS per component)
3. styled-components / Emotion (CSS-in-JS)

**Decision**  
Use **Tailwind CSS**.

**Rationale**  
- Mobile-first by default
- Zero runtime CSS cost (purged at build time)
- No naming conventions to debate — utility classes are self-documenting
- Well-integrated with Next.js
- UX designer can use Tailwind classes directly in prototyping tools

**Consequences**  
- HTML can look verbose with many utility classes
- Requires Tailwind installation and PostCSS config (minimal)

**Alternatives rejected**  
- CSS Modules: more verbose, harder to maintain consistency across surfaces
- CSS-in-JS: runtime cost, more complex setup, unnecessary for MVP

---

## ADR-007 — Resend for Transactional Email

**Status:** Accepted

**Context**  
The app needs to send a small number of transactional emails (registration confirmation, strike warnings). Zero cost is required.

**Options considered**
1. Resend (3,000 emails/month free)
2. Brevo / Sendinblue (300/day free)
3. Team Gmail SMTP (free, limited)
4. No email in MVP

**Decision**  
Use **Resend** free tier.

**Rationale**  
- 3,000 emails/month is sufficient for MVP beta
- Modern API, excellent Next.js integration
- Good deliverability
- Zero cost
- Simple SDK

**Consequences**  
- API key must be server-side only
- Monthly limit must be monitored

**Alternatives rejected**  
- Gmail SMTP: not reliable for transactional email; deliverability issues; rate-limited by Google
- No email: registration confirmation is important for account security; strike warnings are important for user trust

---

## ADR-008 — Web Push API for Push Notifications

**Status:** Accepted

**Context**  
Riders and drivers need real-time status notifications even when the app is not in the foreground. The zero-cost constraint eliminates Firebase Cloud Messaging (FCM) as a paid-integration concern, though FCM itself is free — the concern is architectural complexity.

**Options considered**
1. Web Push API with VAPID keys (standard browser API)
2. Firebase Cloud Messaging (FCM)
3. In-app only (no background notifications)

**Decision**  
Use the **Web Push API** with VAPID keys.

**Rationale**  
- Standard browser API — no third-party dependency
- Works natively in Chrome, Firefox, Edge, and modern Safari (iOS 16.4+)
- VAPID keys generated once, stored as environment variables
- Push subscription stored per-user in the database
- Zero cost, no external service

**Consequences**  
- iOS PWA push requires iOS 16.4+ and the app must be added to home screen
- Service worker required (handled by PWA setup)
- Push subscription must be managed (stored, updated on refresh, cleaned up when expired)

**Alternatives rejected**  
- FCM: adds Firebase dependency; more complex setup; no net benefit over Web Push for a PWA
- In-app only: unacceptable UX — riders need to know when their driver is assigned even if they've switched apps

---

## ADR-009 — Two Admin Roles: Operator and Super-Admin

**Status:** Accepted

**Context**  
The operations team needs to manage requests and drivers. Not all operations staff should have access to pricing configuration or analytics.

**Options considered**
1. Single admin role with full access
2. Two roles: Operator (assign jobs, manage requests) and Super-Admin (full access including pricing and analytics)
3. Full RBAC with granular permissions

**Decision**  
Two roles: **Operator** and **Super-Admin**.

**Rationale**  
- Principle of least privilege: Operators don't need pricing or driver management access
- Simple enough for MVP — no need for a full RBAC system
- Sufficient separation for the team's operational needs

**Consequences**  
- Role is stored in the user's profile
- Middleware must check role on every protected admin route
- Role management (assigning roles to new admin users) is a Super-Admin function

**Alternatives rejected**  
- Single admin: violates least-privilege; all admins could change pricing
- Full RBAC: over-engineered for MVP team size and needs
