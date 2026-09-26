# MVP_CHECKLIST — Regreso Seguro

**Version:** 1.0  
**Last updated:** 2026-09-25  

This is the launch checklist. All items must be checked before the MVP goes live.

---

## Requirements

- [ ] FR-001: User can register with email and password
- [ ] FR-002: User can log in
- [ ] FR-003: Unauthenticated user can browse app; auth gate works on request submission
- [ ] FR-004: Suspended user (3 strikes) cannot submit new requests
- [ ] FR-005: Rider can save a vehicle to profile
- [ ] FR-006: Rider can select saved vehicle or create new at request time
- [ ] FR-007: Rider can submit a service request
- [ ] FR-008: Preliminary price estimate shown before submission (3-component breakdown)
- [ ] FR-009: Final price calculated after driver assignment
- [ ] FR-010: All 5 service statuses functional; transitions enforced
- [ ] FR-011: Real-time status updates reach rider and driver within 3 seconds
- [ ] FR-012: Free cancellation from "Requested" works with no penalty
- [ ] FR-013: Post-assignment cancellation adds 1 strike; 3 strikes = suspension
- [ ] FR-014: Driver can see their assigned job
- [ ] FR-015: Driver can advance service status
- [ ] FR-016: Driver GPS captured when online; stops when offline
- [ ] FR-017: Driver availability toggle works; blocked during active service
- [ ] FR-018: Mutual rating prompt appears on completion; both parties can rate
- [ ] FR-019: Push notification sent to rider on each status change
- [ ] FR-020: Registration confirmation email delivered via Resend
- [ ] FR-021: Rider can view service history
- [ ] FR-022: Operator can view pending requests and assign a driver
- [ ] FR-023: Super-Admin can create, edit, and deactivate driver profiles
- [ ] FR-024: Super-Admin can configure per-km pricing rate
- [ ] FR-025: Analytics dashboard shows all 5 required metrics

---

## Business Rules

- [ ] BR-001: Second concurrent request blocked
- [ ] BR-002/BR-005: Suspension at 3 strikes is immediate
- [ ] BR-007: Unauthenticated request blocked
- [ ] BR-010: No estimate shown if no driver online (OQ-001 must be resolved first)
- [ ] BR-013: Historical prices not recalculated after rate change
- [ ] BR-014/BR-015: Status transitions enforced; only correct actors can trigger each
- [ ] BR-017: Driver cannot go offline during active service
- [ ] BR-018/BR-019: Offline and inactive drivers excluded from assignment pool
- [ ] BR-021: Duplicate license plate rejected per rider
- [ ] BR-024/BR-026: Mutual rating; one per party per service
- [ ] BR-028: Admin role permissions correctly enforced

---

## Open Questions Resolved

- [x] OQ-001 — No drivers online → block request with "No hay conductores disponibles" message
- [x] OQ-002 — Stale driver GPS → warn operator, allow 60s refresh, log if proceeds
- [x] OQ-003 — Driver onboarding → self-register via /driver/register, Super-Admin promotes
- [x] OQ-004 — Operator cancellation from Assigned → no strike; apology + pre-fill re-request
- [x] OQ-005 — Price format → $1.500,00 (es-AR locale)
- [x] OQ-006 — No rating on cancelled services

---

## UX & Behavior

- [ ] All core journeys documented in USER_FLOWS.md are working end-to-end
- [ ] Loading states present on all async operations
- [ ] Empty states present on all lists (no history, no requests, no drivers)
- [ ] Error states present and user-friendly (not raw stack traces)
- [ ] Mobile layout works on iPhone (Safari) and Android (Chrome)
- [ ] PWA is installable on Android Chrome
- [ ] PWA is installable on iOS Safari 16.4+

---

## Security

- [ ] All API keys are server-side only (not in client bundle)
- [ ] All routes are protected by role checks (middleware + RLS)
- [ ] HTTPS enforced (Vercel default)
- [ ] No stack traces or raw errors exposed to users
- [ ] Input validation (Zod) on all API routes
- [ ] RLS policies tested and confirmed via Supabase dashboard
- [ ] `.env.local` and `.env.production` are not committed to git

---

## Testing

- [ ] All unit tests passing (`npm run test`)
- [ ] All integration tests passing
- [ ] All E2E tests passing (`npm run e2e`)
- [ ] Manual checklist M-001 to M-010 completed
- [ ] No critical (P0) bugs open

---

## Infrastructure & Deployment

- [ ] Vercel production deployment is live
- [ ] Supabase production project is active (not paused)
- [ ] All environment variables set in Vercel production
- [ ] GitHub → Vercel CI/CD pipeline working
- [ ] Supabase migrations applied to production database
- [ ] `pricing_config` row seeded with initial per-km rate

---

## Operations Readiness

- [ ] At least one operator account created and tested
- [ ] Super-Admin account created
- [ ] At least one driver profile created and tested
- [ ] CSAT/NPS collection working (in-app rating functional)
- [ ] Vercel Analytics enabled
- [ ] Incident response plan defined (who to contact if app goes down)

---

## Documentation

- [ ] `README.md` updated with: stack overview, local development setup, environment variables
- [ ] `CONTRIBUTING.md` written
- [ ] `docs/` folder committed to repository
- [ ] `AGENTS.md` committed (for future AI coding agent work)

---

## Launch

- [ ] Beta user list prepared
- [ ] Launch communication ready (social media)
- [ ] Rollback plan defined (what to do if critical bug appears post-launch)
- [ ] Success metrics baseline established (see PRD §4)
