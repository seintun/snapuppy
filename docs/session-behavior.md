# Session Behavior

## Login Flow

1. User enters email → receives OTP code → enters code → logged in
2. Session stored in `localStorage` under key `snapuppy-auth`
3. That is the last time they need to enter a code unless one of the expiry conditions below applies

## How Long Sessions Last

| Token | Lifetime | How it works |
|-------|----------|--------------|
| Access token (JWT) | 1 hour | Short-lived, used for API calls |
| Refresh token | Indefinite | Single-use, rotates on each refresh — no clock-based expiry |

The access token expiring every hour is invisible to the user — the SDK silently exchanges the refresh token for a new access token in the background. No prompt, no code, no disruption.

## When the User Will Be Asked to Log In Again

Only these scenarios force a new OTP:

1. **Manual sign-out** — user taps "Sign Out" in the app
2. **Cleared browser/app data** — user or OS wipes localStorage (e.g. Safari "Clear History and Website Data", PWA uninstall)
3. **Supabase session revoked** — revoked from the Supabase dashboard (e.g. security incident)
4. **Refresh token reuse violation** — Supabase has a ~10s reuse window; if the same refresh token is used twice simultaneously (e.g. two tabs racing), one session is invalidated
5. **7-day inactivity in Safari browser tab** — Safari can evict localStorage after 7 days if the site is not visited (ITP). Does not apply to the installed PWA.

## Safari / iOS Caveat

Safari enforces a 7-day ITP (Intelligent Tracking Prevention) storage eviction for web apps that have not been visited. However:

- If the app is installed as a **PWA (Add to Home Screen)**, Apple treats it as a standalone app — ITP eviction does not apply
- In a regular Safari browser tab, storage can be cleared after 7 days of no visits

Users should be prompted to add the app to their home screen. Once installed as a PWA, sessions are effectively permanent until manual sign-out.

## Summary

| Scenario | Re-login needed? |
|----------|-----------------|
| Opens app after 1 hour | No — silent token refresh |
| Opens app after 5 days | No — refresh token still valid |
| Opens app after 30 days | No — refresh token still valid |
| PWA on home screen, any duration | No |
| Safari browser tab, >7 days no visit | Yes (browser evicts storage) |
| User taps Sign Out | Yes |
| Browser/app data cleared | Yes |

## Implementation Notes

- `src/lib/supabase.ts` — explicit `persistSession: true`, `autoRefreshToken: true`, `storageKey: 'snapuppy-auth'`
- `src/hooks/useAuth.ts` — `INITIAL_SESSION` handler trusts the SDK-provided session directly; no server-side `getUser()` re-validation that would break offline or post-expiry reopens
