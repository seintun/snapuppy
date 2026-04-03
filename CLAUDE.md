# snapuppy — AI Agent Instructions

**Project:** snapuppy.life — Mobile-first PWA for independent dog sitters
**Status:** Phase 1 MVP Active
**Stack Docs:** `docs/technical_decisions.md` | **Plan:** `docs/plan.md`

---

## Tech Stack (do not deviate)

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React 19 + TypeScript | Strict mode, ESM |
| Build | Vite (SPA) | NOT Next.js, NOT CRA |
| Styling | Tailwind CSS v4 | No config file — uses `@tailwindcss/vite` plugin |
| Backend | Supabase | PostgreSQL + Auth + Storage |
| Routing | React Router v7 | Client-side only |
| Testing | Vitest (unit) + Playwright (e2e) | jsdom environment |
| Icons | @phosphor-icons/react | No other icon lib |
| Dates | date-fns | No moment.js, no dayjs |
| Package Manager | **Bun** | NEVER npm, NEVER yarn |
| Mobile | PWA-first | Capacitor is Phase 4 — do NOT add it now |

---

## Directory Structure

```
src/
  components/         # Shared UI components (no feature logic)
    layout/           # AppLayout, BottomTabs, FAB, PwaStatus
    ui/               # Badge, Card, DogAvatar, EmptyState, SlideUpSheet
  features/           # Feature modules — each has index.ts barrel export
    auth/
    bookings/
    calendar/
    dogs/
    profile/
  hooks/              # Shared hooks (not feature-specific)
  lib/                # Service utilities (supabase.ts, gcal.ts, rate-calculator.ts)
  types/              # database.ts (Supabase-generated) + index.ts
  test/               # All test files here
  styles.css          # Global CSS + Tailwind @theme tokens
  App.tsx
  main.tsx
```

Use `@/` alias (maps to `src/`) for all internal imports.

---

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| React components | PascalCase | `DogDetailScreen.tsx` |
| Custom hooks | `use` prefix | `useDogs.ts`, `useBookings.ts` |
| Service files | `*Service.ts` suffix | `dogService.ts`, `bookingService.ts` |
| Page screens | `*Screen.tsx` | `DogsScreen.tsx`, `CalendarScreen.tsx` |
| Bottom sheets | `*Sheet.tsx` | `AddDogSheet.tsx`, `CreateBookingSheet.tsx` |
| Feature barrel | `index.ts` or `index.tsx` | Exports only public API |

---

## Code Patterns

### Custom Hooks
Return a structured result object:
```typescript
return { data, loading, error, refresh, create, update, remove };
```
Use a `cancelled` ref in `useEffect` for cleanup to prevent state updates on unmounted components:
```typescript
useEffect(() => {
  let cancelled = false;
  fetchData().then(result => { if (!cancelled) setData(result); });
  return () => { cancelled = true; };
}, []);
```

### Supabase Queries
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.from('table').select('*');
if (error) throw error;
return data;
```
Always use the typed client from `@/lib/supabase`. RLS handles `sitter_id` filtering automatically — do not add manual `sitter_id = auth.uid()` filters in queries.

### TypeScript / Supabase Types
```typescript
import type { Database } from '@/types/database';
type Dog = Database['public']['Tables']['dogs']['Row'];
type DogInsert = Database['public']['Tables']['dogs']['Insert'];
```
Or use the helpers from `@/types/index.ts`:
```typescript
import type { Tables, TablesInsert } from '@/types';
type Dog = Tables<'dogs'>;
type DogInsert = TablesInsert<'dogs'>;
```

### Context + Provider
Global state uses Context + Provider pattern (see `AuthContext`/`AuthProvider`, `ToastContext`/`ToastProvider`).
Never manage auth or toast state directly in components.

---

## Styling Rules

- **Tailwind CSS v4**: No `tailwind.config.js`. Design tokens live in `src/styles.css` under `@theme`.
- **Design System — Sage & Earth palette:**
  - Sage `#8FB886` — primary (nav active, confirm buttons)
  - Terracotta `#D4845A` — CTA, FAB, danger actions
  - Sky `#7EC8E3` — daycare/info accent
  - Warm Beige `#F5F0EB` — page background
  - Bark `#4A3728` — primary text
  - Cream `#FDFBF7` — card/surface background
- **Font**: Nunito (loaded via Google Fonts in `index.html`)
- **CSS classes**: Use semantic classes defined in `src/styles.css` (e.g., `.surface-card`, `.btn-sage`, `.btn-danger`, `.sheet`, `.fab`, `.badge`, `.form-input`)
- **No component libraries**: No shadcn/ui, no MUI, no Chakra, no Radix — build custom components
- **Mobile-first**: Min 44px tap targets everywhere, `env(safe-area-inset-*)` for notch/home-bar

---

## Testing

- Unit tests: `src/test/*.test.ts` using Vitest
- E2e tests: Playwright
- Run: `bun test` / `bun run test:e2e`
- Setup file: `src/test/setup.ts`
- Pattern: `describe`/`it` blocks, arrange → act → assert

---

## Commands

```bash
bun dev               # Start Vite dev server
bun build             # TypeScript check + Vite build
bun test              # Run Vitest unit tests
bun run test:ui       # Vitest UI
bun run test:e2e      # Playwright e2e
bun run lint          # ESLint
bun run format        # Prettier
```

---

## What NOT To Do

- **Never use npm or yarn** — always `bun`
- **No Capacitor** — Phase 4 only; the project is PWA now
- **No component libraries** — build custom with Tailwind + the existing CSS class system
- **No `any` types** — use Supabase-generated types or explicit generics
- **No SSR patterns** — pure SPA; no Next.js conventions
- **No `tailwind.config.js`** — Tailwind v4 uses `@theme` in `src/styles.css`
- **No generic AI aesthetics** — preserve the Sage & Earth design system
- **No per-dog pricing** — rates are universal in the `profiles` table
- **No bidirectional GCal sync** — push-only (Snapuppy → Google Calendar)
- **No manual `sitter_id` filters** — RLS handles authorization automatically

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Typed Supabase client |
| `src/lib/rate-calculator.ts` | Pure functions for booking day pricing |
| `src/lib/gcal.ts` | Google Calendar API integration |
| `src/lib/bookingService.ts` | Booking CRUD + pricing orchestration |
| `src/types/database.ts` | Supabase-generated DB types |
| `src/types/index.ts` | Type helpers (`Tables<T>`, `TablesInsert<T>`) |
| `src/styles.css` | Global CSS, design tokens, all component classes |
| `docs/technical_decisions.md` | Architecture decision records (read before making arch decisions) |
| `docs/plan.md` | Phase 1 MVP implementation plan |
