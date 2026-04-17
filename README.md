# snapuppy

Mobile-first PWA for independent dog sitters. Built with React + TypeScript, Supabase, and an offline-friendly data layer.

## Stack

- React 19 + TypeScript
- Vite SPA
- Tailwind CSS v4
- Supabase (Postgres/Auth/Storage)
- TanStack Query + IndexedDB persistence
- React Router v7
- Vitest + Playwright
- Bun package manager/runtime

## Quick Start

```bash
bun install
bun run dev
```

App runs at Vite default local URL.

## Scripts

```bash
bun run dev        # start dev server
bun run build      # typecheck + production build
bun run test       # unit tests (Vitest)
bun run test:ui    # Vitest UI
bun run test:e2e   # Playwright e2e
bun run lint       # ESLint
bun run format     # Prettier
```

## Environment

Create a `.env` with Supabase credentials:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Project Layout

```text
src/
  components/   # shared UI primitives and layout
  features/     # feature modules (auth, bookings, calendar, dashboard, dogs, invoice, etc.)
  hooks/        # shared hooks
  lib/          # services and domain utilities
  types/        # generated DB types + helpers
docs/
```

## Documentation Map

- Architecture reference: `docs/architecture.md`
- Technical decisions: `docs/technical_decisions.md`
- Debt register and follow-ups: `docs/tech-debt.md`
- Phase 1 MVP plan (historical): `docs/plan.md`
