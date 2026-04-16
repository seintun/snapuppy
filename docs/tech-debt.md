# Technical Debt Register

Last updated: 2026-04-15

## 1) Cleanup Targets (Service/Module Placement)

| Priority | Current file | Debt | Suggested direction |
| --- | --- | --- | --- |
| High | `src/features/client/clientService.ts` + `src/lib/clientService.ts` | Overlapping service layers for client domain | Keep one source of truth (prefer feature-local service with thin lib helper only if shared) |
| High | `src/features/dogs/dogService.ts` | Service logic split between feature and `src/lib` patterns | Decide convention: feature-owned domain services vs centralized `src/lib` services |
| Medium | `src/features/profile/profileService.ts` | Profile write logic is feature-local while adjacent cross-cutting rules exist in `src/lib` | Extract cross-feature concerns (schema compatibility/retries) to `src/lib` helper |
| Medium | `src/features/guest/guestService.ts` | Guest domain service is isolated and not aligned with feature barrel usage | Confirm guest module roadmap; merge into `client/` or promote to first-class feature with UI |
| Medium | `src/lib/invoiceService.ts` | Mostly route-link utility, limited shared domain logic | Move link generation into invoice feature boundary if no other callers emerge |

## 2) Deferred Architecture Improvements

| Priority | Improvement | Why it matters |
| --- | --- | --- |
| High | Split route topology in `src/App.tsx` into route modules | App routing is becoming dense; feature-owned route segments reduce merge conflicts and auth mistakes |
| High | Enforce explicit client-invoice access model | Current `/invoice/:bookingId` path should be reviewed for token/auth guarantees before broader client rollout |
| Medium | Separate unit and e2e test discovery | Prevent Vitest from loading Playwright specs and reduce false CI failures |
| Medium | Consolidate query ownership by feature | Hooks in `src/hooks` and feature-level query code overlap; define clear ownership to reduce drift |
| Low | Reduce inline style fallback usage for loading and small UI states | Improves consistency with design tokens and class-based styling system |

## 3) Known Non-Blocking Issues

| Area | Current state | Impact |
| --- | --- | --- |
| Test runner scope | `bun test` currently picks up `e2e/basic.spec.ts` in Vitest run | Full suite appears red even when unit targets are unchanged |
| Test environment mismatch | `src/test/slide-up-sheet.test.tsx` can fail with `document is not defined` depending on runner context | Flaky feedback loop for UI test runs |
| Vitest API mismatch | `src/test/profile-service.test.ts` uses `vi.hoisted`, which fails in current runtime | Blocks fully green unit suite |
| React compiler lint warnings | `watch()` usage in form-heavy screens triggers `react-hooks/incompatible-library` warnings | Non-blocking today; may affect future compiler optimization |

## 4) Sequencing Recommendation

1. Stabilize test configuration (unit/e2e separation + jsdom consistency).
2. Resolve client invoice access guard model and route ownership.
3. Consolidate service-layer placement conventions (feature vs `src/lib`).
4. Refactor route topology and query ownership only after behavioral parity tests exist.
