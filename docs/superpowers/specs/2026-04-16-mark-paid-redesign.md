# Mark Paid & Invoice Flow Redesign

**Date:** 2026-04-16  
**Status:** Approved for implementation

## Context

The current "Mark Paid" flow is a minimal bottom sheet (tip + notes only), completely disconnected from the invoice breakdown. Sitters have no visibility into the final invoice before confirming payment. Additionally, the booking detail's invoice breakdown ignores `invoice_overrides`, so adjusted totals never appear. The receipt view also misses adjustments in its rendered output.

This redesign replaces the old `CloseBookingSheet` with a rich `MarkPaidSheet` — styled consistently with the existing `GenerateInvoiceSheet` sliding drawer — that shows the full invoice preview, accepts tip/payment method/notes, and confirms payment in one cohesive flow.

---

## 1. Data Layer

### 1a. New DB column: `payment_method`

Add `payment_method: string | null` to the `bookings` table. Stores the method the sitter selected at payment time (e.g. `"cash"`, `"venmo"`, `"zelle"`).

- **Migration:** `ALTER TABLE bookings ADD COLUMN payment_method TEXT;`
- **`src/types/database.ts`:** Add `payment_method: string | null` to the `bookings` Row, Insert, and Update types.

### 1b. Service changes (`src/lib/bookingService.ts`)

- `PaymentCloseInput` type: add `paymentMethod?: string | null`
- `buildPaymentCloseUpdate()` return type: add `payment_method: string | null`
- `buildPaymentCloseUpdate()` body: include `payment_method: input.paymentMethod?.trim() || null`

### 1c. Invoice "Done" sync (`src/features/invoice/GenerateInvoiceSheet.tsx`)

Currently the "Done" button in preview mode calls `onClose()` without persisting. Fix:

- When "Done" is tapped in preview mode, call `saveInvoiceOverrides` with the current overrides before closing
- Also update `total_amount` on the booking: compute adjusted subtotal via `calculateInvoiceTotals(previewOverrides)` and include it in the save payload
- `useSaveInvoiceOverrides` hook (`src/hooks/useBookings.ts`) must accept and write `total_amount` alongside `invoice_overrides`

### 1d. Invoice breakdown fix (`src/features/bookings/BookingDetailScreen.tsx`)

`derivedLineItems` currently ignores `invoice_overrides`. Fix:

- Parse `booking.invoice_overrides` via `parseInvoiceOverrides()`
- If overrides exist and have `lineItems`, use those instead of deriving from `booking.days`
- Fall back to `booking.days` derivation only when no overrides are present
- The "Total Amount" display should use `calculateInvoiceTotals()` when overrides exist, not raw `booking.total_amount`

---

## 2. New `MarkPaidSheet` Component

**File:** `src/features/bookings/MarkPaidSheet.tsx`  
**Replaces:** `src/features/bookings/CloseBookingSheet.tsx` (delete)

### Props

```ts
interface MarkPaidSheetProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord;
  profile: ProfileRow | null | undefined;
}
```

### Internal state

| State | Type | Default |
|-------|------|---------|
| `tipAmount` | `number` | `0` |
| `selectedMethod` | `string \| null` | `null` |
| `notesOpen` | `boolean` | `false` |
| `notes` | `string` | `''` |

### Layout (top to bottom inside `SlideUpSheet`)

Styled consistently with `GenerateInvoiceSheet` — same `SlideUpSheet` wrapper, same spacing tokens, same button classes.

1. **Invoice preview** — `InvoicePreview` rendered with `buildBookingInvoiceInput(booking, profile, { tipAmount, paymentNotes: notes, lineItems: overrides?.lineItems, adjustments: overrides?.adjustments, creditAmount: overrides?.creditAmount })`. Rerenders live as `tipAmount` or `notes` change. `documentLabel: 'Invoice'`, `isPaid: false`.

2. **Tip input** — Currency input below the preview. Label: "Tip received". Updates `tipAmount` state on change, triggering invoice rerender.

3. **Payment method pills** — Parse `profile.payment_instructions` to extract configured methods. Render one pill per method (same badge style as invoice payment badges). Single-select: tapping a pill sets `selectedMethod`. Required — "Mark as Paid" button is disabled if none selected.

4. **Payment notes accordion** — A "+ Add payment note" text link. Tapping sets `notesOpen: true`, reveals a textarea. Collapsed by default.

5. **"Mark as Paid" button** — `btn-danger`, full width, disabled when `isPending` or no `selectedMethod`. On tap: calls `useCloseBooking({ id: booking.id, input: { tipAmount, paymentMethod: selectedMethod, paymentNotes: notes || null } })`, shows success toast, calls `onClose()`.

### Payment method parsing

`profile.payment_instructions` is a JSON string. Parse it to extract the list of configured methods (same logic used by `buildInvoiceHtml()` for rendering payment badges). Each method has: `type` (cash/venmo/zelle/cashapp), `handle`. Display in the same order as the invoice.

---

## 3. `BookingDetailScreen` Changes

**File:** `src/features/bookings/BookingDetailScreen.tsx`

- Replace `CloseBookingSheet` import with `MarkPaidSheet`
- Rename state `closeSheetOpen` → `markPaidSheetOpen`
- Pass `booking` and `profile` to `MarkPaidSheet` (profile is already fetched)
- **Button layout (awaiting):** `[Invoice]` `[Mark Paid]` — same 2-column grid
- **Button layout (paid):** `[View Receipt]` only — remove "Invoice" button from paid state
- **`paid_at` display:** When `booking.status === 'paid'` and `booking.paid_at`, show formatted paid timestamp below the status badge: `"Paid [MMM d, yyyy 'at' h:mm a]"` in `text-xs text-bark-light`

---

## 4. Receipt Fixes

**File:** `src/features/invoice/BookingReceiptView.tsx`

- Pass `adjustments: overrides?.adjustments` into `buildBookingInvoiceInput` overrides (currently missing)
- Ensure `isPaid: true` and `documentLabel: 'Receipt'` are passed (already present)
- The receipt already uses `InvoicePreview` which has Download PNG — no change needed there

**Visual consistency:** Receipt and invoice use the same `InvoicePreview` + `buildInvoiceHtml()` pipeline. No separate design needed — they're the same component, different `documentLabel`.

---

## 5. Files to Create / Modify / Delete

| Action | File |
|--------|------|
| **Create** | `src/features/bookings/MarkPaidSheet.tsx` |
| **Delete** | `src/features/bookings/CloseBookingSheet.tsx` |
| **Modify** | `src/features/bookings/BookingDetailScreen.tsx` |
| **Modify** | `src/features/invoice/GenerateInvoiceSheet.tsx` |
| **Modify** | `src/hooks/useBookings.ts` (`useSaveInvoiceOverrides`) |
| **Modify** | `src/lib/bookingService.ts` (`buildPaymentCloseUpdate`, `PaymentCloseInput`) |
| **Modify** | `src/features/invoice/BookingReceiptView.tsx` |
| **Modify** | `src/types/database.ts` |
| **DB migration** | Add `payment_method TEXT` column to `bookings` |

---

## 6. Verification

1. **Invoice breakdown fix:** Open a booking with `invoice_overrides` saved → booking detail should show adjusted line items and total, not the raw `total_amount`
2. **Mark Paid sheet:** Tap "Mark Paid" on an awaiting booking → sheet opens with full invoice preview, tip input, payment method pills (from profile), notes accordion
3. **Live tip update:** Enter a tip → invoice preview rerenders with updated total
4. **Payment method required:** "Mark as Paid" button stays disabled until a method is selected
5. **Confirm payment:** Select method, tap "Mark Paid" → booking moves to Paid tab, `paid_at` timestamp appears on detail screen
6. **Paid button layout:** Paid bookings show only "View Receipt" (no "Invoice" button)
7. **Receipt:** "View Receipt" opens receipt with correct line items, adjustments, tip, and paid timestamp; Download PNG works
8. **Invoice "Done" sync:** Edit invoice overrides → preview → Done → booking detail shows updated total
