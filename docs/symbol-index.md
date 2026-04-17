# Function & Symbol Index

Jump directly to a symbol without searching the repo. Read this file on demand when working on a specific domain.

---

## Auth & Session

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `useAuthContext()` | `src/features/auth/AuthContext.ts` | Consume auth state (throws if outside AuthProvider) |
| `useAuth()` | `src/hooks/useAuth.ts` | Full auth state machine (user, profile, loading, callbacks) |
| `AuthProvider` | `src/features/auth/AuthProvider.tsx` | Context provider — wraps useAuth() into context |
| `RequireAuth` | `src/features/auth/RequireAuth.tsx` | Route guard (loading spinner / redirect / outlet) |
| `sendPasscode(email)` | `src/hooks/useAuth.ts` | Send OTP to email |
| `verifyPasscode(email, code)` | `src/hooks/useAuth.ts` | Verify OTP, create session |
| `signOut()` | `src/hooks/useAuth.ts` | Clear session and redirect |

## Bookings — Read

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `useBookings()` | `src/hooks/useBookings.ts` | All bookings list query (`['bookings', userId]`) |
| `useBooking(id)` | `src/hooks/useBookings.ts` | Single booking with initialData from list cache |
| `useCalendarBookings(month)` | `src/hooks/useBookings.ts` | Month-scoped flat query (`['calendar-bookings', userId, 'YYYY-MM']`) |
| `useBookingFormOptions()` | `src/hooks/useBookings.ts` | Dogs + profile for the create-booking form |
| `useAutoAdvanceBookings()` | `src/hooks/useBookings.ts` | useEffect that promotes overdue bookings on mount |
| `getBookings(sitterId)` | `src/lib/bookingService.ts` | Supabase query — all bookings with nested dogs + days |
| `getBooking(id)` | `src/lib/bookingService.ts` | Single booking with full join |

## Bookings — Write

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `useCreateBooking()` | `src/hooks/useBookings.ts` | Mutation: insert booking + days; offline-queued on error |
| `useUpdateBookingStatus()` | `src/hooks/useBookings.ts` | Mutation: status transition; offline-queued on error |
| `useCheckInBooking()` | `src/hooks/useBookings.ts` | Shortcut: upcoming → active |
| `useCheckOutBooking()` | `src/hooks/useBookings.ts` | Shortcut: active → awaiting |
| `useCloseBooking()` | `src/hooks/useBookings.ts` | Mutation: awaiting → paid (stores tip + payment method) |
| `useSaveBookingDays()` | `src/hooks/useBookings.ts` | Mutation: per-day rate/holiday overrides |
| `useSaveInvoiceOverrides()` | `src/hooks/useBookings.ts` | Mutation: save line-item overrides as JSON on booking |
| `useDeleteBooking()` | `src/hooks/useBookings.ts` | Mutation: delete booking + cascade days; offline-queued |
| `createBooking(input)` | `src/lib/bookingService.ts` | Insert booking + N booking_days rows |
| `closeBooking(id, sitterId, input)` | `src/lib/bookingService.ts` | Mark paid; asserts status = 'awaiting' |
| `autoAdvanceBookings(sitterId)` | `src/lib/bookingService.ts` | Date-based status promotion (upcoming→active, active→awaiting) |

## Pricing

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `generateBookingDays(input)` | `src/lib/rate-calculator.ts` | Core pricing: date range + rates → `BookingDayCalculationRow[]` |
| `calculateBookingTotal(days)` | `src/lib/rate-calculator.ts` | Sum day amounts → total |
| `detectBookingType(start, end)` | `src/lib/rate-calculator.ts` | Same date = 'daycare'; else 'boarding' |
| `buildBookingPricing(...)` | `src/lib/bookingService.ts` | Orchestrates rate-calculator; returns full pricing object |
| `repriceBookingDays(...)` | `src/lib/bookingService.ts` | Recalculate amounts for existing days with overrides |

## Dogs

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `useDogs()` | `src/hooks/useDogs.ts` | All dogs query (`['dogs', userId]`) |
| `useDog(dogId)` | `src/hooks/useDogs.ts` | Single dog with initialData from list |
| `useCreateDog()` | `src/hooks/useDogs.ts` | Mutation: insert dog; offline-queued |
| `useUpdateDog()` | `src/hooks/useDogs.ts` | Mutation: update dog; broadly invalidates bookings cache |
| `useDeleteDog()` | `src/hooks/useDogs.ts` | Mutation: cancel dog bookings, then delete; offline-queued |

## Profile

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `useProfile()` | `src/hooks/useProfile.ts` | Sitter profile query (`['profile', userId]`) |
| `useUpdateProfile()` | `src/hooks/useProfile.ts` | Mutation: update profile + rates |
| `profileService` | `src/features/profile/profileService.ts` | Profile writes with schema-compat retry logic |
| `logoUpload` | `src/features/profile/logoUpload.ts` | Business logo upload to Supabase Storage |

## Invoice & Payment

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `calculateInvoiceTotals(input)` | `src/lib/invoiceGenerator.ts` | Base + adjustments + tip → `InvoiceTotals` |
| `parseInvoiceOverrides(raw)` | `src/lib/invoiceGenerator.ts` | Validate + normalize line-item JSON from DB |
| `buildInvoiceHtml(input)` | `src/lib/invoiceTemplate.ts` | Full HTML invoice doc with Sage & Earth styling |
| `parsePaymentMethodsJson(raw)` | `src/lib/paymentUtils.ts` | Decode structured payment methods JSON (robust to encoding issues) |
| `formatPhoneUS(digits)` | `src/lib/paymentUtils.ts` | "2125551234" → "(212) 555-1234" |

## Offline Queue

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `enqueueOfflineMutation(kind, payload)` | `src/lib/offlineQueue.ts` | Push mutation to localStorage FIFO queue |
| `dequeueOfflineMutation()` | `src/lib/offlineQueue.ts` | Pop oldest mutation (FIFO) |
| `listOfflineMutations()` | `src/lib/offlineQueue.ts` | Inspect queue without draining |
| `clearOfflineQueue()` | `src/lib/offlineQueue.ts` | Wipe queue |
| `processOfflineQueue(handler)` | `src/lib/sync.ts` | Drain queue calling handler per mutation; returns processed count |
| `useOfflineSync()` | `src/hooks/useOfflineSync.ts` | React hook — auto-drains on reconnect; returns `{ isOnline, isSyncing }` |
| `OfflineMutationKind` | `src/lib/offlineQueue.ts` | Enum of supported kinds (create-booking, update-booking, …) |

## Metrics & Reports

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `calculateMetrics(bookings, dogs)` | `src/lib/metricsCalculator.ts` | Facade → `metricsService.computeDashboardMetrics()` |
| `computeDashboardMetrics(input)` | `src/lib/metricsService.ts` | Pure function: revenue, occupancy, top dogs for current month |
| `useReports()` | `src/hooks/useReports.ts` | Report cards query/mutation orchestration |

## Validation Schemas

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `CreateBookingSchema` | `src/lib/schemas.ts` | Booking form — date range, dog, notes |
| `DogSchema` | `src/lib/schemas.ts` | Dog form — name, phone, optional photo |
| `ProfileSchema` | `src/lib/schemas.ts` | Profile form — rates, cutoff_time |
| `PaymentMethodSchema` | `src/lib/schemas.ts` | Discriminated union: Venmo / CashApp / Zelle |
| `EmailSchema` | `src/lib/schemas.ts` | Auth email validation |

## Types

| Symbol | File | What it does |
| ------ | ---- | ------------ |
| `Tables<'bookings'>` | `src/types/index.ts` | Row type for any table |
| `TablesInsert<'bookings'>` | `src/types/index.ts` | Insert type for any table |
| `Database` | `src/types/database.ts` | Full generated Supabase schema |
| `PaymentMethod` | `src/types/index.ts` | Re-export from schemas.ts |
