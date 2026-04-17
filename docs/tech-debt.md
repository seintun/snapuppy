# Technical Debt Register

Last updated: 2026-04-16

## 1) Cleanup Targets (Service/Module Placement)

| Priority | Current file                                                        | Debt                                                                                       | Suggested direction                                                                          |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| High     | `src/features/dogs/dogService.ts`                                   | Service logic split between feature and `src/lib` patterns                                 | Decide convention: feature-owned domain services vs centralized `src/lib` services           |
| Medium   | `src/features/profile/profileService.ts`                            | Profile write logic is feature-local while adjacent cross-cutting rules exist in `src/lib` | Extract cross-feature concerns (schema compatibility/retries) to `src/lib` helper            |
| Medium   | `src/features/guest/guestService.ts`                                | Guest domain service is isolated and not aligned with feature barrel usage                 | Confirm guest module roadmap; promote to first-class feature with UI or fold into core flows |
| Low      | Invoice link generation                                             | No dedicated invoiceService.ts exists; link generation lives inline in invoice feature     | Consolidate if a second caller emerges; not worth extracting yet                             |

## 2) Deferred Architecture Improvements

| Priority | Improvement                                                        | Why it matters                                                                                                |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| High     | Split route topology in `src/App.tsx` into route modules           | App routing is becoming dense; feature-owned route segments reduce merge conflicts and auth mistakes          |
| Medium   | Separate unit and e2e test discovery                               | Prevent Vitest from loading Playwright specs and reduce false CI failures                                     |
| Medium   | Consolidate query ownership by feature                             | Hooks in `src/hooks` and feature-level query code overlap; define clear ownership to reduce drift             |
| Low      | Reduce inline style fallback usage for loading and small UI states | Improves consistency with design tokens and class-based styling system                                        |

## 3) Known Non-Blocking Issues

| Area                         | Current state                                                                                 | Impact                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Test runner command mismatch | Using `bun test` runs Bun's test runner; unit suite is configured for Vitest (`bun run test`) | Confusing local feedback when command usage is mixed                     |
| Bun runner DOM support       | Bun test runner does not mirror Vitest jsdom setup for all UI tests                           | Prefer `bun run test` for unit checks; keep e2e separate with Playwright |

## 4) Sequencing Recommendation

1. Stabilize test configuration (unit/e2e separation + jsdom consistency).
2. Consolidate service-layer placement conventions (feature vs `src/lib`).
3. Refactor route topology and query ownership only after behavioral parity tests exist.
