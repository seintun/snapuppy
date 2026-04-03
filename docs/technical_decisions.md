# snapuppy.life — Technical Decisions

**Date:** 2026-04-02 | **Session:** MVP Design & Planning

This document captures every architectural and design decision made during the planning session, with rationale and alternatives considered.

---

## 1. Build Tool: Vite (not CRA, Next.js, or Expo)

**Decision:** Vite SPA
**Rationale:**
- Capacitor (Phase 4) wraps a static SPA — Next.js SSR adds complexity with no benefit since there's no SEO requirement and a single authenticated user.
- CRA is deprecated.
- Vite offers the fastest HMR for development and produces a clean static dist for both PWA deployment and Capacitor packaging.
- Expo was considered for React Native path but rejected: web-first with Capacitor wrapper (Phase 4) gives us PWA immediately without sacrificing native later.

**Trade-off:** No SSR/SSG, no file-based routing — acceptable since this is a private, auth-gated tool.

---

## 2. Package Manager: Bun

**Decision:** Bun (never npm)
**Rationale:** User's established convention across all projects. Faster installs, built-in test runner (complementing Vitest), ESM-native.

**Trade-off:** Bun lockfile format differs from npm/pnpm — if a collaborator uses npm they'll need to use `bun install`. Acceptable for a solo sitter tool.

---

## 3. Backend: Supabase (not Firebase, PlanetScale, or custom API)

**Decision:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
**Rationale:**
- Auth: Supabase Auth handles Google OAuth natively with token refresh, and can pass Google access tokens for Calendar API — this eliminates building a custom OAuth proxy.
- Database: PostgreSQL gives us proper relational data (booking → booking_days → dog) with Row-Level Security for future multi-tenant without schema changes.
- Storage: Built-in bucket for dog photos with signed URLs.
- Edge Functions: Available for future webhook handling (Phase 3).
- Firebase was considered — rejected because Firestore's document model is awkward for relational booking/dog data and lacks built-in RLS.

**Trade-off:** Supabase free tier has pausing behavior. Production will need Pro plan.

---

## 4. Auth: Google OAuth Only (not email/password)

**Decision:** Google OAuth exclusively via Supabase Auth
**Rationale:**
- The sitter is a single known user — no registration flow needed.
- Google OAuth bundles the Calendar scope into login, so the user authenticates once and the app gets both identity and calendar access.
- Eliminates password management UX entirely.
- Supabase stores and refreshes the Google access token automatically.

**Trade-off:** Requires a Google account. If the sitter switches to Apple ecosystem, we'd add Apple Sign-In in Phase 4 via Capacitor.

---

## 5. Google Calendar Sync Direction: Push-only (Snapuppy → Google)

**Decision:** Snapuppy is the source of truth; sync pushes to Google Calendar
**Rationale:**
- Bidirectional sync is complex (conflict resolution, stale detection, rate limits).
- The sitter creates bookings in Snapuppy, not directly in Google Calendar.
- Google Calendar serves as a "shared view" for family/assistants — read-only consumers.
- On app open, we check for deleted/moved events and flag for review (not auto-resolve).

**Trade-off:** If someone deletes an event in Google Calendar, Snapuppy won't automatically mark it cancelled — requires a manual review flag. Acceptable for Phase 1.

---

## 6. Dedicated "Snapuppy Bookings" Calendar (not the user's primary calendar)

**Decision:** Create a separate calendar via Google Calendar API on first login
**Rationale:**
- Keeps sitter's personal life and work bookings separate.
- The calendar can be shared with family/assistants without exposing personal events.
- Deleting it in GCal doesn't nuke the sitter's primary calendar.
- `gcal_calendar_id` stored in the `profiles` table.

**Trade-off:** Requires an extra API call on first login to create the calendar. Handled gracefully — if it already exists (re-login), we detect and reuse.

---

## 7. Rate Model: Universal Rates + Per-Day Overrides

**Decision:** Profile stores universal nightly/daycare/holiday rates; `booking_days` stores per-day amounts with override capability
**Rationale:**
- The sitter uses the same rates for all dogs (not per-dog pricing).
- Holiday surcharge is a flat dollar add-on, not a percentage (simpler math, easier to explain to clients).
- Cutoff time (default 11:00 AM): if last-day pickup is after cutoff, append a daycare charge — this mirrors how most sitters manually calculate.
- Per-day overrides in `booking_days` give flexibility without complicating the standard flow.

**Trade-off:** No per-dog or per-breed pricing. Can be added later by adding a rate override column to `dogs` and using it in the calculator.

---

## 8. Booking Type Auto-Detection

**Decision:** 1 day = Daycare automatically; 2+ days = Boarding
**Rationale:**
- Industry standard for Rover/Wag-style sitters.
- Reduces cognitive load — sitter picks dates, type is inferred.
- Manual override available in the creation form.

**Trade-off:** Edge case: a multi-day boarding where the sitter only charges daycare rates (very unusual). Handled by per-day override.

---

## 9. Data Model: `booking_days` Normalization

**Decision:** Each day of a booking gets its own row in `booking_days`
**Rationale:**
- Enables the daily breakdown accordion in the UI.
- Per-day overrides (toggle boarding/daycare, mark holiday) are stored directly on the row.
- `total_amount` on `bookings` is a denormalized sum — pre-computed for list views without joins.
- Cascade delete ensures booking_days are cleaned up when a booking is cancelled.

**Trade-off:** Insert is slightly more complex (generate N rows for N days). Handled by `lib/rate-calculator.ts` pure functions.

---

## 10. Styling: Tailwind CSS v4 (not CSS Modules, Styled Components, or v3)

**Decision:** Tailwind CSS v4
**Rationale:**
- User convention across all projects.
- v4 uses CSS-native cascade layers and `@theme` for design tokens — cleaner than v3's `tailwind.config.js`.
- The `@tailwindcss/vite` plugin integrates seamlessly with our Vite setup.
- Design token approach aligns with the Sage & Earth palette definition.

**Trade-off:** v4 is newer — some third-party component libraries haven't updated yet. Not a concern since we're building custom components.

---

## 11. Design System: "Sage & Earth + Playful"

**Decision:** Custom design system, no component library (shadcn/ui, MUI, Chakra)
**Rationale:**
- The playful, dog-centric aesthetic (paw motifs, bounce animations, Nunito font, warm terracotta) would require extensive overriding of any generic library.
- Building custom components gives full control over the organic, rounded feel.
- Mobile-first with 44px minimum tap targets is easier to enforce from scratch.
- The `frontend-design` skill guidelines call for distinctive, context-specific aesthetics — not generic AI aesthetics.

**Palette decision:** Sage green (#8FB886) as primary (calming, nature-forward), terracotta (#D4845A) as warm accent for actions/FAB, sky blue (#7EC8E3) for daycare differentiation, warm beige (#F5F0EB) as background (not cold white).

**Typography decision:** Nunito as primary (rounded, bubbly, 8 weights). Will pair with a display font for headers in implementation for distinctiveness.

**Trade-off:** More upfront component work. Worth it for the cohesive aesthetic.

---

## 12. Navigation: Bottom Tabs + FAB

**Decision:** 4 bottom tabs (Calendar, Bookings, Dogs, Profile) + always-visible FAB
**Rationale:**
- Mobile-first: bottom tabs are thumb-reachable on large phones.
- Calendar is the home/primary view (most daily interactions start there).
- FAB provides quick booking creation from any context without switching tabs.
- Slide-up sheets for creation forms avoid full-screen navigation for transient actions.

**Trade-off:** 4 tabs is at the upper limit of bottom navigation usability. Profile is lower-frequency — considered putting it in a hamburger menu, but kept it as a tab for discoverability.

---

## 13. PWA First, Capacitor Later (Phase 4)

**Decision:** Build as PWA now; wrap with Capacitor in Phase 4
**Rationale:**
- PWA is immediately distributable (no App Store review).
- The sitter can install it to their home screen today.
- Capacitor wraps a Vite SPA without code changes — our architecture is already compatible.
- Native features (haptics, native album access for Bento cards) are Phase 4 requirements — don't need them for Phase 1.

**Trade-off:** iOS PWA has limitations (no push notifications, limited background sync). Acceptable for Phase 1; resolved in Phase 4.

---

## 14. Testing Strategy: Vitest + Playwright

**Decision:** Vitest for unit tests (rate calculator), Playwright for e2e
**Rationale:**
- User convention.
- Rate calculator logic is complex pure functions — ideal for unit testing.
- E2e tests cover the full booking flow (the most critical user journey).
- Vitest runs in jsdom via `@testing-library/react` for component tests.

**Trade-off:** No component-level visual regression testing in Phase 1. Can add Chromatic/Percy in Phase 3.

---

## 15. Multi-Tenant Architecture (RLS) from Day 1

**Decision:** All tables have `sitter_id UUID REFERENCES profiles(id)` with RLS `sitter_id = auth.uid()`
**Rationale:**
- Adding RLS later is painful (schema migration + data backfill).
- Single-user now, but the architecture supports multiple sitters without code changes.
- Supabase RLS policies are declared in SQL migrations — version-controlled and auditable.

**Trade-off:** Slightly more verbose queries (always join/filter by sitter_id). Negligible performance impact.

---

## 16. Dog Photos: Supabase Storage (not local device)

**Decision:** Upload dog photos to Supabase Storage; store URL in `dogs.photo_url`
**Rationale:**
- Photos need to be accessible across devices (phone + tablet + web).
- The draft spec proposed local-only media with Capacitor FileSystem — rejected for Phase 1 because PWA has no reliable local storage for binary files.
- Supabase Storage provides signed URLs, bucket-level policies, and CDN delivery.
- Phase 4 Capacitor can add local album access for the Bento report card feature.

**Trade-off:** Dog photos hit the network. Acceptable — they're loaded once per dog, cached by the browser.

---

## 17. `lib/rate-calculator.ts` as Pure Functions

**Decision:** Rate calculation is pure TypeScript (no Supabase calls)
**Rationale:**
- Pure functions are trivially unit-testable.
- The calculator runs client-side for the live rate preview in the booking form.
- The same logic generates `booking_days` rows on booking creation.
- No server-side computation needed — all inputs are available in the client (profile rates, date range, holiday flag).

---

## Decisions Deferred to Later Phases

| Decision | Phase | Reason Deferred |
|----------|-------|-----------------|
| Native haptics on tally increment | 4 | Requires Capacitor |
| Bento report card (OffscreenCanvas) | 2 | Complex feature, non-blocking |
| Revenue/tax dashboard | 3 | Needs booking history volume |
| Push notifications | 4 | PWA limitation on iOS |
| Per-dog custom rates | TBD | Not requested by current user |
| Apple Sign-In | 4 | Current user is Google |
| Bidirectional GCal sync | TBD | Complexity vs. benefit ratio |
