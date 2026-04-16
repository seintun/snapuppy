# Profile Tab Redesign — Spec

**Date:** 2026-04-16  
**Branch:** `feat/profile-tab-redesign`  
**Status:** Implemented

---

## Goals

Replace the old profile screen (business_name field, raw logo URL, free-text payment instructions) with a first-class identity screen:

- `display_name` as the primary name field
- Logo upload via Supabase Storage (`business-logos` bucket)
- Structured payment methods (Venmo / Cash App / Zelle), stored as JSON
- Validation for Zelle (email or US phone), auto-prefix for Venmo (`@`) / CashApp (`$`)
- Layout: Identity Hero → Payment → Rates → Sticky Save

---

## Data Model

| Column | Change |
|---|---|
| `display_name` | Now primary name field; null renders as "Snapuppy Sitter" |
| `business_name` | Removed from UI; DB column preserved; never written going forward |
| `business_logo_url` | Populated from Supabase Storage after upload (not user-entered URL) |
| `payment_instructions` | Format changed from free text → JSON `[{"type":"venmo"\|"zelle"\|"cashapp","handle":string}]` |

### Supabase Storage

- Bucket: `business-logos`
- Path: `{sitterId}/logo.{ext}`
- Compression: `compressImageWithAutoFormat()` with `maxDimension: 512`

### Payment JSON schema

```ts
type PaymentMethod =
  | { type: "venmo"; handle: string }
  | { type: "cashapp"; handle: string }
  | { type: "zelle"; handle: string }  // email or US phone validated
```

Null or empty array → payment section hidden on client portal/invoices.  
Existing free-text value → shows migration notice, not crashed.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/schemas.ts` | Added `PaymentMethodSchema`, replaced `businessName`/`paymentInstructions` with `displayName`/`paymentMethods` |
| `src/types/index.ts` | Re-exports `PaymentMethod` type |
| `src/features/profile/logoUpload.ts` | New: logo upload to `business-logos` bucket |
| `src/hooks/useProfile.ts` | Added `parsePaymentMethods`, `serializePaymentMethods`, `isLegacyPaymentInstructions` |
| `src/features/profile/profileService.ts` | Never writes `business_name`; simplified fallback paths |
| `src/features/profile/ProfileScreen.tsx` | Full UI redesign |
| `src/test/profile-service.test.ts` | Updated test to verify `business_name` is never written |
