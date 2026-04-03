# Snapuppy Phase 1 Branch Strategy

This repo will use **one feature branch per implementation step** so work can run in parallel with other agents and merge incrementally.

## Rules

- Branch naming: `feat/step-<n>-<slug>`
- Base branch: `main`
- Merge strategy: fast-forward disabled (`--no-ff`) to preserve step history
- Commit frequency: commit each logical slice (schema, service, UI shell, tests) instead of large batch commits
- Verification before merge: `bun run lint && bun run build && bun run test`

## Step Branches

1. **Step 1: Supabase setup**
   - Branch: `feat/step-1-supabase-setup`
   - Scope: migrations, RLS, storage policies, typed client, DB types

2. **Step 2: Auth + Profile**
   - Branch: `feat/step-2-auth-profile`
   - Scope: login flow, auth guard, profile CRUD screen

3. **Step 3: Design system + layout shell**
   - Branch: `feat/step-3-design-shell`
   - Scope: theme tokens, layout, tab bar, FAB, shared UI primitives

4. **Step 4: Dog profiles**
   - Branch: `feat/step-4-dog-profiles`
   - Scope: dog CRUD, list/detail, search, photo upload wiring

5. **Step 5: Calendar view**
   - Branch: `feat/step-5-calendar-view`
   - Scope: month grid, booking blocks, today marker, interactions

6. **Step 6: Booking CRUD + detail + breakdown**
   - Branch: `feat/step-6-booking-crud`
   - Scope: booking sheet, create/edit/cancel, booking-day generation, detail accordion

7. **Step 7: rate calculator hardening**
   - Branch: `feat/step-7-rate-lib`
   - Scope: pure rate calculation helpers + unit tests

8. **Step 8: Bookings list tab**
   - Branch: `feat/step-8-bookings-list`
   - Scope: filtered booking cards, navigation to details

9. **Step 9: PWA setup**
   - Branch: `feat/step-9-pwa`
   - Scope: manifest/service worker/install prompt/offline shell hardening

10. **Step 10: Polish**

- Branch: `feat/step-10-polish`
- Scope: toasts, loading/error states, motion polish, copy pass

## Parallelization Guidance

- Safe to run in parallel: Steps **3, 9** (low coupling).
- Start Step 10 after base UI shell from Step 3 exists.
- Steps 4/5/6/8 depend on Step 1 + Step 3 foundations.

## Continuous Coordination Protocol

To avoid stepping on other engineers:

- Before starting any step branch: run `git fetch --all --prune` and compare with `main`.
- Keep each branch scoped to its step file set; avoid touching files owned by active parallel steps unless required for conflict resolution.
- Before each merge: rebase step branch onto latest `main`, resolve conflicts, and rerun verification.
- Track ownership in PR/commit messages by listing primary files touched.
- If another engineer lands overlapping changes first, adapt by cherry-picking your non-overlapping commits onto a fresh branch and shrinking scope.

Suggested file ownership (default):

- Step 1: `supabase/**`, `src/lib/supabase.ts`, `src/types/database.ts`
- Step 3: `src/App.tsx`, `src/main.tsx`, `src/components/**`, base layout styles
- Step 7: `src/lib/rate-calculator.ts`, tests under `src/test/**`
- Step 9: `public/manifest.json`, `public/sw.js`, install/offline glue in app shell
- Step 10: cross-cut polish only after feature branches are merged

## Merge Order

Recommended order:
1 → 3 → 7 → 9 → 2 → 4 → 5 → 6 → 8 → 10

When another agent lands overlapping work, rebase corresponding step branch on latest `main` before merge.
