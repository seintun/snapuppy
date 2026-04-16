# snapuppy Architecture Reference

## Scope

This document describes the current Phase 1 architecture of the snapuppy SPA, focusing on data flow, auth boundaries, offline behavior, and module dependency rules.

## 1) End-to-End Data Flow

### Primary runtime path

```text
Supabase (Postgres/Auth/Storage)
  -> service layer (`src/lib/*`, selected `src/features/*/*Service.ts`)
  -> hooks/query layer (`src/hooks/*`, feature query helpers)
  -> feature UI (`src/features/*`)
  -> shared UI primitives/layout (`src/components/*`)
```

### Query and mutation flow

1. Screen/component calls a hook (for example `useBookings`, `useDogs`, `useProfile`).
2. Hook executes query or mutation function from service layer.
3. Service function interacts with typed Supabase client (`src/lib/supabase.ts`).
4. Hook updates TanStack Query cache and invalidates related keys.
5. UI rerenders from cache state.

### Booking domain example

```text
BookingsScreen / BookingDetailScreen
  -> useBookings / useBooking (`src/hooks/useBookings.ts`)
  -> bookingService (`src/lib/bookingService.ts`)
  -> Supabase tables (bookings, booking_days, dogs, profiles)
```

## 2) Auth Architecture

The app has two independent auth models.

### A) Sitter auth (primary app)

- Provider chain: `AuthContext` -> `AuthProvider` -> `RequireAuth` route guard.
- Session source: Supabase auth user/session.
- Protected routes: core app routes (`/today`, `/calendar`, `/bookings`, `/dogs`, `/profile`).
- Main files:
  - `src/features/auth/AuthContext.ts`
  - `src/features/auth/AuthProvider.tsx`
  - `src/features/auth/RequireAuth.tsx`

### B) Client portal auth (token/session based)

- Entry route: `/client/:token`.
- Guard: `RequireClientAuth` checks browser-stored client session against route token.
- Session source: client token validation + client session helpers.
- Main files:
  - `src/features/client/clientAuth.ts`
  - `src/lib/clientToken.ts`
  - `src/features/client/RequireClientAuth.tsx`

### Auth boundary note

Sitter auth and client auth are intentionally separate; do not share context/session assumptions across them.

## 3) Offline Strategy

Offline support is composed of cache persistence plus a mutation queue.

### A) Query cache persistence

- TanStack Query cache is persisted via `PersistQueryClientProvider`.
- IndexedDB persister is configured in `src/lib/persister.ts` and mounted in `src/main.tsx`.
- Effect: previously fetched data is available faster on reload/offline.

### B) Mutation queue plumbing

- Mutations can be enqueued to `src/lib/offlineQueue.ts`.
- Queue drain/orchestration is in `src/lib/sync.ts`.
- Connectivity trigger hook is `src/hooks/useOfflineSync.ts`.
- Current state: queue and drain plumbing exist; mutation replay behavior depends on handler wiring per mutation path.

## 4) Feature Boundaries and Dependencies

## Dependency direction (enforced convention)

```text
features -> hooks/lib/types/components
hooks -> lib/types/auth-context
lib -> supabase/types/utility libs
components -> minimal dependencies (presentation-first)
```

### Feature module responsibilities

- `auth`: sitter authentication lifecycle and route protection.
- `bookings`: booking lifecycle management UIs and status transitions.
- `calendar`: calendar rendering and date-scoped booking visibility.
- `client`: client-facing portal with token/session access.
- `dashboard`: today and metrics summary surfaces.
- `dogs`: dog profiles and CRUD interactions.
- `guest`: guest-specific service logic.
- `invoice`: invoice rendering/print/share/client invoice view.
- `profile`: sitter profile, rates, preferences, client link UI.
- `recurring`: recurring availability and recurrence-related UI.
- `reports`: reporting surfaces and report detail flows.

### Known boundary friction

- Service ownership is split between `src/lib` and some feature folders (`client`, `dogs`, `profile`, `guest`).
- This is tracked as tech debt in `docs/tech-debt.md`.

## 5) State Management Model

State is intentionally layered by lifetime and scope.

### Context state (global/session scope)

- `AuthContext`: sitter auth/session user state.
- Toast context (`ToastProvider`): transient app-wide feedback.

### Server/cache state (remote + synchronized)

- TanStack Query stores Supabase-backed data.
- Query keys are scoped by user/session ids where relevant.
- Mutations invalidate affected query keys after writes.

### Local component state (view-only)

- Form state, modal/sheet visibility, stepper selections, temporary UI flags.
- Keep local-only state out of global context unless consumed broadly across routes.

## 6) Critical Entry Points

| File | Role |
| --- | --- |
| `src/main.tsx` | App bootstrap, provider tree, persistence, service worker registration |
| `src/App.tsx` | Route graph and auth guard composition |
| `src/lib/supabase.ts` | Typed backend client entry |
| `src/hooks/useBookings.ts` | Representative domain hook for query/mutation orchestration |
| `src/lib/bookingService.ts` | Representative domain service for complex data operations |

## 7) Practical Rules for Contributors

1. Prefer feature-local UI logic, but keep cross-feature primitives in `src/components`.
2. Keep network and persistence logic in service/hook layers, not screen components.
3. Keep auth boundaries explicit: sitter routes and client routes should remain isolated.
4. Treat offline replay behavior as an explicit contract; avoid implicit queue side effects.
5. Use `@/` imports and existing query-key patterns to avoid accidental cache fragmentation.
