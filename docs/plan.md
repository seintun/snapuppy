# snapuppy.life — Phase 1 MVP Implementation Plan

**Status:** Active | **Date:** 2026-04-02 | **Version:** 1.0

---

## Overview

snapuppy.life is a mobile-first PWA serving as the operations command center for independent dog sitters. Phase 1 MVP covers: Passwordless Auth, Dog Profiles, Bookings, Calendar, Rate Calculation, and PWA shell.

---

## Step 0: Project Scaffold ✅

- `bun create vite` → React 19 + TypeScript (ESM)
- Install: `tailwindcss@4`, `@supabase/supabase-js`, `react-router-dom`, `date-fns`, `@phosphor-icons/react`
- Configure: Vite (`@/` alias), ESLint, Prettier, Vitest (jsdom), Playwright
- Folder structure:
  ```
  src/
    components/     # Shared UI components
    features/       # Feature modules (calendar, bookings, dogs, profile)
    lib/            # supabase.ts, rate-calculator.ts
    hooks/          # Custom React hooks
    types/          # TypeScript types
    App.tsx
    main.tsx
  public/
    manifest.json   # PWA manifest
    sw.js           # Service worker
  supabase/
    migrations/     # SQL migration files
  docs/
  ```
- PWA manifest with sage theme color `#8FB886`
- Git init + initial commit

---

## Step 1: Supabase Setup

- Create Supabase project (manual — user action required)
- Run SQL migrations for 4 tables: `profiles`, `dogs`, `bookings`, `booking_days`
- Enable Row-Level Security on all tables
- RLS policies: `sitter_id = auth.uid()`
- Supabase Storage bucket for dog photos
- Configure Supabase email auth + magic link redirect URL
- DB trigger: auto-create `profiles` row on new `auth.users` signup
- `src/lib/supabase.ts` — typed Supabase client
- `src/types/database.ts` — TypeScript types matching DB schema

---

## Step 2: Auth + Profile

- Magic-link login screen (single email input, passwordless)
- `useAuth` hook — Supabase `onAuthStateChange`
- Protected route wrapper (`<RequireAuth>`)
- Profile tab: display name, rate settings (nightly, daycare, holiday surcharge, cutoff time)
- Profile CRUD with Supabase (`profiles` table)
- On first login: create auth user + profile row via trigger, then route into app

---

## Step 3: Design System + Layout Shell

- Tailwind v4 theme: full Sage & Earth palette
- Typography: Nunito (Google Fonts) — rounded, friendly
- Components:
  - `BottomTabs` — 4-tab nav (Calendar, Bookings, Dogs, Profile)
  - `FAB` — terracotta floating action button with bounce animation
  - `SlideUpSheet` — reusable bottom sheet
  - `Card`, `DogAvatar`, `Badge`, `EmptyState` (with paw motif)
- React Router tab-based navigation
- Frontend-design principle: atmospheric backgrounds, Nunito + complementary display pairing, staggered reveals, unexpected spatial composition

---

## Step 4: Dog Profiles

- Dogs tab: grid/list of dog cards (photo avatar, name, owner)
- Add Dog slide-up sheet: name, owner name, phone, photo upload to Supabase Storage, notes
- Dog detail view: full profile
- Edit/delete dog
- Search/filter by name
- `useDogsHook` for data fetching

---

## Step 5: Calendar View (Home)

- Monthly calendar grid
- Month navigation (swipe-friendly arrows)
- Booking blocks:
  - Boarding: sage green continuous bar spanning days
  - Daycare: sage chip/dot on single day
  - Holiday: terracotta accent border or blush badge
- Tap empty date → open booking creation sheet (pre-filled date)
- Tap booking block → booking detail
- "Today" indicator
- `useCalendarHook` — fetch bookings for displayed month

---

## Step 6: Booking CRUD + Detail

**Create Booking (slide-up sheet):**

- Dog selector (searchable from dogs table)
- Date range picker (start/end)
- Auto-detect type: 1 day = daycare, 2+ days = boarding
- Holiday toggle
- Live rate preview (computed from profile rates)

**On confirm:**

- Insert `bookings` row
- Generate `booking_days` rows (one per day, computed amounts)
- Compute `total_amount` = sum of booking_days
- Persist booking and booking_days only in Supabase

**Booking Detail screen:**

- Dog avatar + name header
- Date range, type badge, status
- Daily breakdown accordion (date, rate type, holiday badge, amount)
- Per-day overrides: toggle boarding/daycare or holiday per day
- Recalculate total on override
- Edit booking, Cancel booking (soft-delete in app data only)

---

## Step 7: Internal Calendar Consistency

- Keep bookings as the source of truth for calendar rendering
- Ensure booking create/update/cancel paths update `bookings` + `booking_days` only
- `src/lib/rate-calculator.ts`: pure functions for rate computation + Vitest unit tests

---

## Step 8: Bookings List Tab

- Active bookings as cards sorted by start date
- Card: dog avatar, dog name, date range, amount, status badge
- Filter: active / completed / cancelled
- Tap → booking detail
- `useBookingsHook`

---

## Step 9: PWA Setup

- `public/manifest.json`: complete with name, icons, theme/background colors
- `public/sw.js`: cache static assets, offline shell
- `index.html` meta tags: `apple-mobile-web-app-capable`, status bar style, splash
- Service worker registration in `main.tsx`

---

## Step 10: Polish & Testing

- Loading states, error handling, toast notifications
- Micro-copy: "Woof! Booking confirmed!", playful empty states
- Bounce animations on FAB, 200ms ease-out transitions
- Paw-print confetti on booking success
- Responsive: iPhone SE → iPhone 15 Pro Max
- Vitest unit tests: rate calculation, booking day generation
- Playwright e2e: magic-link login → create dog → create booking → verify calendar → edit → cancel
- Lighthouse PWA audit

---

## Verification Checklist

- [ ] Auth: Magic link login → profile created → rates configurable
- [ ] Dogs: Create dog with photo → list → edit → delete
- [ ] Booking: Tap date → form → rate preview correct → confirm → block on calendar
- [ ] Rate calc: 3 nights × boarding rate + holiday surcharge on holiday nights
- [ ] Per-day override: toggle rate type/holiday → total recalculates
- [ ] PWA: Add to home screen iOS/Android → offline shell loads
- [ ] Responsive: iPhone SE, iPhone 15 Pro, Pixel 7, Samsung Galaxy

---

## Future Phases

| Phase | Scope                                                        |
| ----- | ------------------------------------------------------------ |
| 2     | Bento Report Cards (photo grid + tallies + share)            |
| 3     | Financial Dashboard (revenue charts, CSV export)             |
| 4     | Capacitor Native (haptics, native album, push notifications) |
