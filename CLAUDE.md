# snapuppy — AI Agent Context

**Project:** snapuppy.life  
**Status:** Phase 2+ in progress (PWA-first)  
**Purpose:** Mobile-first sitter operations app (bookings, calendar, dogs, invoicing)  
**Primary references:** `docs/technical_decisions.md`, `docs/architecture.md`

## Stack (Locked)

| Layer           | Choice                                             |
| --------------- | -------------------------------------------------- |
| Framework       | React 19 + TypeScript (strict, ESM)                |
| Build           | Vite SPA                                           |
| Styling         | Tailwind CSS v4 + `src/styles.css` `@theme` tokens |
| Backend         | Supabase (Postgres/Auth/Storage)                   |
| Routing         | React Router v7 (client-only)                      |
| State/Data      | TanStack Query + IndexedDB persistence             |
| Validation      | Zod + react-hook-form + `@hookform/resolvers`      |
| Testing         | Vitest (unit) + Playwright (e2e)                   |
| Icons           | `@phosphor-icons/react`                            |
| Dates           | `date-fns`                                         |
| Package manager | Bun                                                |

## Modules

Use `@/` alias for all imports. Features: `auth`, `bookings`, `calendar`, `dashboard`, `dogs`, `guest`, `invoice`, `profile`, `recurring`, `reports`. For full module map, service functions, data flow diagrams, and dependency rules: read `docs/architecture.md`.

## High-Impact Patterns (Non-Obvious)

| Pattern                                                                                                    | Source of truth                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| RLS is the primary auth layer; many services also use explicit `sitter_id` scoping filters                 | `src/lib/bookingService.ts`, `src/features/dogs/dogService.ts`                                       |
| Zod schemas are centralized and consumed by forms via RHF resolvers                                        | `src/lib/schemas.ts`                                                                                 |
| Query cache is persisted to IndexedDB for offline-first behavior                                           | `src/lib/persister.ts`, `src/main.tsx`                                                               |
| Offline queue plumbing exists (enqueue/drain/status); mutation replay handlers should be verified per path | `src/lib/offlineQueue.ts`, `src/lib/sync.ts`, `src/hooks/useOfflineSync.ts`                          |
| Sitter auth ownership chain                                                                                | `src/hooks/useAuth.ts` -> `src/features/auth/AuthContext.ts` -> `src/features/auth/AuthProvider.tsx` |

## Commands

```bash
bun run dev
bun run build
bun run test
bun run test:ui
bun run test:e2e
bun run lint
bun run format
```

## Guardrails

- Use Bun only (`npm`/`yarn` forbidden).
- Keep SPA architecture (no SSR/Next.js patterns).
- No component libraries (no MUI/Chakra/Radix/shadcn); build with existing primitives + `styles.css` tokens.
- No `tailwind.config.js`; theme lives in `src/styles.css` `@theme`.
- Use Supabase-generated types/helpers (`src/types/database.ts`, `src/types/index.ts`); avoid `any`.
- Preserve Phase 1 constraints: no Capacitor, no per-dog pricing, no external calendar sync.
- Prefer direct imports from module files over broad app-level barrels.

## Key Files

| File                                     | Why it matters                                                |
| ---------------------------------------- | ------------------------------------------------------------- |
| `src/App.tsx`                            | Global route topology, auth gates, lazy route boundaries      |
| `src/main.tsx`                           | Provider tree, Query persistence, service worker registration |
| `src/styles.css`                         | Global tokens and semantic utility classes                    |
| `src/lib/supabase.ts`                    | Typed Supabase client entry point                             |
| `src/lib/schemas.ts`                     | Zod validation contracts                                      |
| `src/lib/bookingService.ts`              | Booking domain service logic and joins                        |
| `src/lib/rate-calculator.ts`             | Pricing math and booking-rate calculations                    |
| `src/lib/invoiceTemplate.ts`             | Invoice HTML template/sanitization surface                    |
| `src/lib/offlineQueue.ts`                | Offline mutation persistence and queue semantics              |
| `src/lib/sync.ts`                        | Replay/synchronization engine                                 |
| `src/lib/persister.ts`                   | TanStack Query IndexedDB persister                            |
| `src/hooks/useBookings.ts`               | Main booking query/mutation hooks                             |
| `src/features/auth/AuthProvider.tsx`     | Sitter auth lifecycle and session wiring                      |
| `src/features/profile/profileService.ts` | Profile writes and schema-compat retry logic                  |
| `src/types/database.ts`                  | Generated DB schema types                                     |
| `src/types/index.ts`                     | Type helpers (`Tables`, `TablesInsert`, etc.)                 |
| `docs/technical_decisions.md`            | Architecture decision log                                     |
| `docs/architecture.md`                   | Data flow, auth boundaries, module dependency rules           |

## Symbol Index

For function/symbol lookup by domain (auth, bookings, pricing, dogs, invoice, offline, metrics, types): read `docs/symbol-index.md` on demand — not loaded every session.
