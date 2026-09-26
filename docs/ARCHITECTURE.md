# ARCHITECTURE — Regreso Seguro

**Version:** 1.0  
**Status:** Approved for MVP  
**Last updated:** 2026-09-25  

---

## 1. Overview

Regreso Seguro is a **Progressive Web App (PWA)** built with Next.js and deployed on Vercel. The backend is entirely managed by Supabase (PostgreSQL, Auth, Realtime, Storage). External services are limited to zero-cost providers.

The architecture is deliberately simple for the MVP: a single Next.js monorepo handles all three user surfaces (rider app, driver app, admin panel) through role-based routing. There are no microservices, no separate backend process, and no paid infrastructure.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                    Browser / PWA                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Rider App  │  │ Driver App │  │  Admin Panel   │  │
│  └─────┬──────┘  └──────┬─────┘  └────────┬───────┘  │
│        └───────────────┬┘                 │           │
│                        │  Next.js App Router          │
└────────────────────────┼─────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    ┌─────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐
    │  Next.js   │ │  Supabase  │ │  External   │
    │ API Routes │ │  Realtime  │ │  Services   │
    └─────┬──────┘ └─────┬──────┘ └────┬────────┘
          │              │              │
    ┌─────▼──────┐ ┌─────▼──────┐      │
    │ Supabase   │ │ Supabase   │  ┌───▼───────────┐
    │   Auth     │ │ PostgreSQL │  │ OpenRouteService│
    └────────────┘ └────────────┘  │ (routing/dist) │
                                   ├───────────────┤
                                   │ OpenStreetMap  │
                                   │ (map tiles)    │
                                   ├───────────────┤
                                   │ Resend         │
                                   │ (email)        │
                                   ├───────────────┤
                                   │ Web Push API   │
                                   │ (notifications)│
                                   └───────────────┘
```

---

## 3. Frontend Architecture

### Framework
**Next.js 14+ (App Router)** — single repository for all user surfaces.

### Role-Based Routing

| Route prefix | Surface | Roles allowed |
|---|---|---|
| `/` | Rider app (public + authenticated) | Unauthenticated, Rider |
| `/driver` | Driver interface | Driver |
| `/admin` | Admin panel | Operator, Super-Admin |
| `/auth` | Login / registration | Unauthenticated |

Route protection is enforced via Next.js middleware using the Supabase Auth session.

### PWA Configuration
- `next-pwa` or manual service worker for offline capability
- Web Push subscription managed client-side
- Installable on Android and iOS via manifest

### Map Rendering
- **Leaflet.js** with OpenStreetMap tiles
- Dynamic import (SSR disabled) for Leaflet components
- Geocoding and routing via OpenRouteService REST API (client-side calls go through Next.js API routes to avoid exposing API key — though ORS free tier key is not sensitive)

### State Management
- **React Context + Server Components** for global auth/user state
- **Supabase Realtime** subscriptions for live service status (no additional state library needed for MVP)
- **SWR or React Query** for server-state caching (AI Recommendation — keeps things simple)

### Styling
- **Tailwind CSS** — utility-first, zero runtime cost, well-suited for mobile-first PWA (AI Recommendation)

---

## 4. Backend Architecture

### Approach
**Next.js API Routes** (in `/app/api/`) serve as the backend layer. No separate backend process is needed. Supabase handles the heavy lifting (auth, DB, realtime).

### API Route Responsibilities
- Business logic that cannot run in the browser (price calculation, strike enforcement, role checks)
- Proxying requests to OpenRouteService (hides API key, enables rate-limit handling)
- Sending emails via Resend SDK
- Sending Web Push notifications

### Authentication
- **Supabase Auth** (email + password)
- Session managed via Supabase Auth helpers for Next.js (`@supabase/ssr`)
- JWT stored in cookies (httpOnly, secure)
- Row Level Security (RLS) on all Supabase tables for defense-in-depth

### Authorization
- Role stored in `profiles.role` (rider | driver | operator | super_admin)
- Next.js middleware checks session + role before serving protected routes
- RLS policies enforce data access at the database level

### Realtime
- **Supabase Realtime** channels subscribed per service ID
- Clients subscribe to their relevant service channel
- Admin panel subscribes to all pending/active requests channel
- Driver subscribes to their assigned service channel

---

## 5. Database

**Provider:** Supabase (PostgreSQL 15)  
**Schema:** See `docs/DATA_MODEL.md`  
**Access control:** Row Level Security (RLS) enabled on all tables  
**Migrations:** Managed via Supabase CLI migration files in `/supabase/migrations/`

---

## 6. External Integrations

### OpenRouteService (Routing / Distance)
- **Purpose:** Calculate distance in km for the 3 price legs; geocoding for address lookup
- **Tier:** Free (2,000 requests/day)
- **Key management:** API key stored in Vercel environment variables; calls proxied through Next.js API route
- **Fallback:** If ORS is unavailable, show an error message to the user; do not silently calculate incorrect prices

### OpenStreetMap (Map Tiles)
- **Purpose:** Render map in the browser
- **Rendering:** Leaflet.js + OSM tile server
- **No API key required** for standard OSM tiles (usage policy applies — tile caching recommended)

### Resend (Transactional Email)
- **Purpose:** Registration confirmation, strike notifications
- **Tier:** Free (3,000 emails/month)
- **Key management:** API key in Vercel environment variables, server-side only

### Web Push API (Push Notifications)
- **Purpose:** Status change notifications to riders and drivers
- **Implementation:** VAPID keys generated once; stored in environment variables; push subscription stored per user in DB
- **No cost:** Standard browser API, no third-party service

---

## 7. Security

| Concern | Approach |
|---|---|
| Authentication | Supabase Auth, email+password, JWT in httpOnly cookies |
| Authorization | Role in user profile + Next.js middleware + RLS policies |
| API key protection | All API keys server-side only (Vercel env vars), never in client bundle |
| Input validation | Zod schemas on all API route inputs |
| SQL injection | Not applicable — Supabase client uses parameterized queries |
| XSS | React's default escaping; no `dangerouslySetInnerHTML` |
| HTTPS | Enforced by Vercel (all traffic TLS 1.3) |
| Rate limiting | Basic per-IP rate limiting on API routes (Next.js middleware) |
| Sensitive data | DNI and license numbers stored in DB but not exposed in API responses unless necessary |

---

## 8. Error Handling

- API routes return structured JSON errors with codes (not raw exceptions)
- Client displays user-friendly messages; raw errors never surfaced to UI
- Supabase Realtime disconnections are handled with automatic reconnection + state rehydration
- ORS API failures show an explicit error to user; request flow is blocked (not silently broken)

---

## 9. Monitoring & Logging

- **Vercel Analytics:** basic request/error monitoring (free tier)
- **Supabase Dashboard:** DB query performance, auth events
- Structured `console.error` logs on API routes (captured by Vercel logs)
- No paid observability service in MVP

---

## 10. Deployment

| Component | Platform | Cost |
|---|---|---|
| Next.js app (frontend + API) | Vercel free tier | $0 |
| PostgreSQL + Auth + Realtime + Storage | Supabase free tier | $0 |
| Domain (optional) | Bring-your-own or Vercel subdomain | $0 for .vercel.app |

### CI/CD
- GitHub repository → Vercel automatic deploys on push to `main`
- Preview deployments on pull requests (Vercel default behavior)
- Supabase migrations applied manually via Supabase CLI or linked to GitHub Actions (optional)

### Environment Variables
Required in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTESERVICE_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

---

## 11. Scalability Considerations (Post-MVP)

The MVP architecture intentionally uses Supabase free tier and Vercel free tier. Known limits:
- Supabase free: 500MB DB, 50,000 MAU, 2GB bandwidth
- Vercel free: 100GB bandwidth, 100,000 function invocations/day
- OpenRouteService free: 2,000 requests/day

For MVP beta with a small closed user group, these limits are more than sufficient. Scaling path when needed:
1. Supabase Pro ($25/month) for DB and auth growth
2. Vercel Pro ($20/month) for higher function limits
3. ORS self-hosted or paid tier if routing volume grows

---

## 12. Local Development

```bash
# 1. Clone repository
git clone <repo-url>
cd regreso-seguro

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env.local
# Fill in Supabase and ORS keys

# 4. Start Supabase local instance
npx supabase start

# 5. Run DB migrations
npx supabase db push

# 6. Start development server
npm run dev
```
