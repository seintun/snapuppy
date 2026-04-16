# Snapuppy Phase 2 - Implementation Plan

> **Status**: Historical plan (partially implemented)  
> **Created**: April 2026  
> **Total Tasks**: 77 tasks across 7 phases (~37 days)

---

## Executive Summary

| Phase | Features                   | Tasks        | Est. Days   |
| ----- | -------------------------- | ------------ | ----------- |
| **1** | Client Portal + Quick Add  | 19 tasks     | 10          |
| **2** | Daily Report Cards         | 11 tasks     | 5           |
| **3** | Recurring Bookings         | 11 tasks     | 5           |
| **4** | Invoice + Payment Close    | 14 tasks     | 5           |
| **5** | Business Metrics Dashboard | 10 tasks     | 3           |
| **6** | Offline Mode + Sync        | 10 tasks     | 7           |
| **7** | UX Polish                  | 12 tasks     | 2           |
|       | **TOTAL**                  | **77 tasks** | **37 days** |

---

# PHASE 1: CLIENT PORTAL + QUICK ADD (19 Tasks, 10 Days)

## 1A. Database Setup (Day 1)

| Task     | Description                                                                                               | File Changes            |
| -------- | --------------------------------------------------------------------------------------------------------- | ----------------------- |
| **1A.1** | Run SQL: Add `client_token` (TEXT), `client_token_expires` (TIMESTAMP) to profiles                        | Supabase SQL Editor     |
| **1A.2** | Run SQL: Add `source` (TEXT DEFAULT 'manual') to bookings                                                 | Supabase SQL Editor     |
| **1A.3** | Update `src/types/database.ts` — add `client_token`, `client_token_expires`, `source` to type definitions | `src/types/database.ts` |
| **1A.4** | Update `src/types/index.ts` — add helper types if needed                                                  | `src/types/index.ts`    |

### SQL Migration - Phase 1A

```sql
-- Add client token to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS client_token TEXT,
ADD COLUMN IF NOT EXISTS client_token_expires TIMESTAMP;

-- Add booking source
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
```

---

## 1B. Client Token Generation - Sitter Side (Day 2-3)

| Task     | Description                                                                                                                                | File Changes                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **1B.1** | Create `src/lib/clientToken.ts` — `generateClientToken()` (UUID + random string, 24 chars), `validateToken(token)` returns profile or null | NEW FILE                                 |
| **1B.2** | Create `src/lib/clientService.ts` — `verifyClientCredentials(sitterId, clientName, clientPhone)` matches against dogs table                | NEW FILE                                 |
| **1B.3** | Update `src/features/profile/profileService.ts` — add `updateClientToken(userId, token)` function to generate and store token              | `src/features/profile/profileService.ts` |
| **1B.4** | Update `src/hooks/useProfile.ts` — add `useGenerateClientLink()` mutation hook                                                             | `src/hooks/useProfile.ts`                |

---

## 1C. Share Modal UI (Day 3)

| Task     | Description                                                                                             | File Changes                               |
| -------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **1C.1** | Create `src/features/profile/ClientLinkModal.tsx` — displays token URL, copy button, QR code generation | NEW FILE                                   |
| **1C.2** | Update `src/features/profile/ProfileScreen.tsx` — add "Share Client Portal" button in header section    | `src/features/profile/ProfileScreen.tsx`   |
| **1C.3** | Add "Regenerate Token" button in modal (invalidates old token, creates new)                             | `src/features/profile/ClientLinkModal.tsx` |
| **1C.4** | Add "Copy Link" functionality with success toast                                                        | `src/features/profile/ClientLinkModal.tsx` |

---

## 1D. Client Auth Flow (Day 4-5)

| Task     | Description                                                                                                                                              | File Changes                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **1D.1** | Update `src/App.tsx` — add route `/client/:token` pointing to lazy-loaded ClientAuthScreen                                                               | `src/App.tsx`                              |
| **1D.2** | Create `src/features/client/ClientAuthScreen.tsx` — verifies token validity on mount, shows phone verification form                                      | NEW FILE                                   |
| **1D.3** | Add phone input field — validates against 10 digits                                                                                                      | `src/features/client/ClientAuthScreen.tsx` |
| **1D.4** | Create `src/features/client/clientAuth.ts` — `setClientSession(data)`, `getClientSession()`, `clearClientSession()` using localStorage with 7-day expiry | NEW FILE                                   |
| **1D.5** | Create `src/features/client/RequireClientAuth.tsx` — route wrapper that checks client session, redirects to token URL if invalid                         | NEW FILE                                   |

---

## 1E. Client Dashboard (Day 5-6)

| Task     | Description                                                                                                                          | File Changes                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **1E.1** | Create `src/features/client/ClientLayout.tsx` — consistent layout with sitter app (bottom nav hidden, header with logout)            | NEW FILE                                  |
| **1E.2** | Create `src/features/client/ClientDashboard.tsx` — main screen showing "Welcome [Client Name]"                                       | NEW FILE                                  |
| **1E.3** | Create `src/features/client/clientQueries.ts` — `useClientBookings(sitterId, clientPhone)` fetches only bookings for client's dog(s) | NEW FILE                                  |
| **1E.4** | Create `src/features/client/ClientBookingCard.tsx` — displays booking date, dog name, status badge, total                            | NEW FILE                                  |
| **1E.5** | Add "Upcoming Bookings" section — filter bookings where status='active'                                                              | `src/features/client/ClientDashboard.tsx` |
| **1E.6** | Add "Past Bookings" section — filter bookings where status='completed'                                                               | `src/features/client/ClientDashboard.tsx` |
| **1E.7** | Add logout button — clears client session, redirects to `/client/:token`                                                             | `src/features/client/ClientDashboard.tsx` |

---

## 1F. Client Booking Request (Day 6-7)

| Task     | Description                                                                                                                                  | File Changes                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **1F.1** | Create `src/features/client/ClientRequestSheet.tsx` — simplified booking form (pre-selects client's dog)                                     | NEW FILE                                     |
| **1F.2** | Add date range picker — reuse calendar component from CreateBookingSheet                                                                     | `src/features/client/ClientRequestSheet.tsx` |
| **1F.3** | Add "Special Requests" textarea field                                                                                                        | `src/features/client/ClientRequestSheet.tsx` |
| **1F.4** | Update `src/lib/bookingService.ts` — add `createClientRequest(input)` that creates booking with status='pending' and source='client_request' | `src/lib/bookingService.ts`                  |
| **1F.5** | Create `src/hooks/useClientBooking.ts` — mutation hook for submitting requests                                                               | NEW FILE                                     |
| **1F.6** | Add "Request Sent" success state with message "Sitter will review your request"                                                              | `src/features/client/ClientRequestSheet.tsx` |

---

## 1G. Sitter Request Management (Day 7-8)

| Task     | Description                                                                                                                       | File Changes                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------ | ----------- | ------------------------------------------ |
| **1G.1** | Update `src/features/bookings/bookingUi.ts` — add `BookingSource` type ('manual'                                                  | 'client_request'), add source filter options | `src/features/bookings/bookingUi.ts` |
| **1G.2** | Update `src/features/bookings/BookingsScreen.tsx` — add filter pills: "All"                                                       | "Active"                                     | "Pending" (client requests)          | "Completed" | `src/features/bookings/BookingsScreen.tsx` |
| **1G.3** | Create `src/features/bookings/PendingRequestCard.tsx` — distinct styling for client requests (amber highlight, shows client name) | NEW FILE                                     |
| **1G.4** | Create `src/features/bookings/AcceptRequestModal.tsx` — shows request details, "Confirm Booking" button, auto-calculates pricing  | NEW FILE                                     |
| **1G.5** | Update `src/lib/bookingService.ts` — add `acceptClientRequest(bookingId, sitterId)` changes status from 'pending' to 'active'     | `src/lib/bookingService.ts`                  |
| **1G.6** | Create `src/features/bookings/DeclineRequestModal.tsx` — confirmation with optional reason field                                  | NEW FILE                                     |
| **1G.7** | Update `src/lib/bookingService.ts` — add `declineClientRequest(bookingId, sitterId, reason?)` changes status to 'cancelled'       | `src/lib/bookingService.ts`                  |

---

## 1H. Quick Add for Manual Bookings (Day 9-10)

| Task     | Description                                                                                       | File Changes                                   |
| -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **1H.1** | Update `src/features/bookings/CreateBookingSheet.tsx` — add "Quick Add" toggle/button near submit | `src/features/bookings/CreateBookingSheet.tsx` |
| **1H.2** | When Quick Add active: skip dog selector, show "Dog Name" + "Owner Phone" quick fields            | `src/features/bookings/CreateBookingSheet.tsx` |
| **1H.3** | If new dog (phone not found): auto-create dog record with owner info                              | `src/features/bookings/CreateBookingSheet.tsx` |
| **1H.4** | Auto-set `source='manual'` in booking insert                                                      | `src/features/bookings/CreateBookingSheet.tsx` |
| **1H.5** | Update `src/features/bookings/BookingsScreen.tsx` — add "Manual" badge next to source             | `src/features/bookings/BookingsScreen.tsx`     |

---

# PHASE 2: DAILY REPORT CARDS (11 Tasks, 5 Days)

## 2A. Database + Types (Day 1)

| Task     | Description                                                  | File Changes            |
| -------- | ------------------------------------------------------------ | ----------------------- |
| **2A.1** | Run SQL: Create `daily_reports` table                        | Supabase SQL Editor     |
| **2A.2** | Run SQL: Add RLS policies                                    | Supabase SQL Editor     |
| **2A.3** | Update `src/types/database.ts` — add DailyReports table type | `src/types/database.ts` |
| **2A.4** | Add `Tables<'daily_reports'>` helper to `src/types/index.ts` | `src/types/index.ts`    |

### SQL Migration - Phase 2A

```sql
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photos TEXT[],
  notes TEXT,
  potty_status TEXT CHECK (potty_status IN ('good', 'accident', 'none_out')),
  meals_given TEXT[],
  behavior TEXT,
  medications_given TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(booking_id, date)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy (simplified for MVP)
CREATE POLICY "Owners can manage own reports" ON daily_reports
  FOR ALL USING (true);
```

---

## 2B. Report Service (Day 2)

| Task     | Description                                          | File Changes               |
| -------- | ---------------------------------------------------- | -------------------------- |
| **2B.1** | Create `src/lib/reportService.ts` — CRUD operations  | NEW FILE                   |
| **2B.2** | Create `src/hooks/useReports.ts` — hooks for reports | NEW FILE                   |
| **2B.3** | Add photo upload — reuses `dog-photos` bucket        | `src/lib/reportService.ts` |

---

## 2C. Sitter Report Entry (Day 2-3)

| Task     | Description                                                                | File Changes                                 |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| **2C.1** | Update `src/features/dashboard/DashboardScreen.tsx` — add "Add Report" FAB | `src/features/dashboard/DashboardScreen.tsx` |
| **2C.2** | Create `src/features/reports/ReportSheet.tsx` — full report form           | NEW FILE                                     |
| **2C.3** | Add date selector                                                          | `src/features/reports/ReportSheet.tsx`       |
| **2C.4** | Add photo upload (camera + gallery)                                        | `src/features/reports/ReportSheet.tsx`       |
| **2C.5** | Add potty status selector                                                  | `src/features/reports/ReportSheet.tsx`       |
| **2C.6** | Add meals input                                                            | `src/features/reports/ReportSheet.tsx`       |
| **2C.7** | Add behavior notes                                                         | `src/features/reports/ReportSheet.tsx`       |
| **2C.8** | Add medications field                                                      | `src/features/reports/ReportSheet.tsx`       |

---

## 2D. Report Viewing - Sitter (Day 3-4)

| Task     | Description                                                                | File Changes                                    |
| -------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| **2D.1** | Update `src/features/bookings/BookingDetailScreen.tsx` — add "Reports" tab | `src/features/bookings/BookingDetailScreen.tsx` |
| **2D.2** | Create `src/features/reports/ReportList.tsx` — chronological list          | NEW FILE                                        |
| **2D.3** | Create `src/features/reports/ReportCard.tsx` — preview card                | NEW FILE                                        |
| **2D.4** | Add edit functionality                                                     | `src/features/reports/ReportList.tsx`           |
| **2D.5** | Add delete functionality                                                   | `src/features/reports/ReportList.tsx`           |
| **2D.6** | Create `src/features/reports/ReportDetailModal.tsx` — full view            | NEW FILE                                        |

---

## 2E. Client Report Viewing (Day 4-5)

| Task     | Description                                                        | File Changes                                  |
| -------- | ------------------------------------------------------------------ | --------------------------------------------- |
| **2E.1** | Create `src/features/client/ClientBookingDetail.tsx` — client view | NEW FILE                                      |
| **2E.2** | Add "Reports" section — read-only                                  | `src/features/client/ClientBookingDetail.tsx` |
| **2E.3** | Add photo lightbox                                                 | `src/features/client/ClientBookingDetail.tsx` |

---

# PHASE 3: RECURRING BOOKINGS (11 Tasks, 5 Days)

## 3A. Database + Types (Day 1)

| Task     | Description                                | File Changes            |
| -------- | ------------------------------------------ | ----------------------- |
| **3A.1** | Run SQL: Create `recurring_bookings` table | Supabase SQL Editor     |
| **3A.2** | Run SQL: Add RLS policies                  | Supabase SQL Editor     |
| **3A.3** | Update `src/types/database.ts`             | `src/types/database.ts` |

### SQL Migration - Phase 3A

```sql
CREATE TABLE IF NOT EXISTS recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  repeat_days TEXT[],
  repeat_pattern TEXT CHECK (repeat_pattern IN ('weekly', 'biweekly', 'monthly')),
  time_slot_start TIME,
  time_slot_end TIME,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;
```

---

## 3B. Sitter Recurring Availability (Day 2)

| Task     | Description                                               | File Changes                                       |
| -------- | --------------------------------------------------------- | -------------------------------------------------- |
| **3B.1** | Create `src/lib/recurringService.ts` — CRUD               | NEW FILE                                           |
| **3B.2** | Create `src/hooks/useRecurring.ts`                        | NEW FILE                                           |
| **3B.3** | Create `src/features/recurring/RecurringAvailability.tsx` | NEW FILE                                           |
| **3B.4** | Add day-of-week checkboxes                                | `src/features/recurring/RecurringAvailability.tsx` |
| **3B.5** | Add time range inputs                                     | `src/features/recurring/RecurringAvailability.tsx` |
| **3B.6** | Save to database                                          | `src/features/recurring/RecurringAvailability.tsx` |

---

## 3C. Client Recurring Booking (Day 3)

| Task     | Description                                                                | File Changes                                 |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| **3C.1** | Update `src/features/client/ClientRequestSheet.tsx` — add recurring toggle | `src/features/client/ClientRequestSheet.tsx` |
| **3C.2** | Add repeat pattern selector                                                | `src/features/client/ClientRequestSheet.tsx` |
| **3C.3** | Add day selector                                                           | `src/features/client/ClientRequestSheet.tsx` |
| **3C.4** | Validate against sitter availability                                       | `src/features/client/ClientRequestSheet.tsx` |
| **3C.5** | Show pricing preview                                                       | `src/features/client/ClientRequestSheet.tsx` |

---

## 3D. Auto-Creation of Recurring (Day 4-5)

| Task     | Description                                                           | File Changes                                    |
| -------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| **3D.1** | Add `generateRecurringDates` to `src/lib/recurringService.ts`         | `src/lib/recurringService.ts`                   |
| **3D.2** | Update `src/lib/bookingService.ts` — generate 3 months of bookings    | `src/lib/bookingService.ts`                     |
| **3D.3** | Create individual booking records                                     | `src/lib/bookingService.ts`                     |
| **3D.4** | Store master `recurring_bookings` record                              | `src/lib/bookingService.ts`                     |
| **3D.5** | Update `src/features/bookings/BookingsScreen.tsx` — add badge         | `src/features/bookings/BookingsScreen.tsx`      |
| **3D.6** | Create `src/features/bookings/RecurringSeriesModal.tsx`               | NEW FILE                                        |
| **3D.7** | Update `src/features/bookings/BookingDetailScreen.tsx` — pause/cancel | `src/features/bookings/BookingDetailScreen.tsx` |

---

# PHASE 4: INVOICE + PAYMENT CLOSE (14 Tasks, 5 Days)

## 4A. Database + Types (Day 1)

| Task     | Description                                  | File Changes            |
| -------- | -------------------------------------------- | ----------------------- |
| **4A.1** | Run SQL: Add payment columns to bookings     | Supabase SQL Editor     |
| **4A.2** | Run SQL: Add `business_logo_url` to profiles | Supabase SQL Editor     |
| **4A.3** | Update `src/types/database.ts`               | `src/types/database.ts` |

### SQL Migration - Phase 4A

```sql
-- Add payment tracking to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add business logo to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS business_logo_url TEXT;
```

---

## 4B. Invoice Data + Generation (Day 2)

| Task     | Description                                         | File Changes                  |
| -------- | --------------------------------------------------- | ----------------------------- |
| **4B.1** | Create `src/lib/invoiceGenerator.ts`                | NEW FILE                      |
| **4B.2** | Create `src/lib/invoiceTemplate.ts` — HTML template | NEW FILE                      |
| **4B.3** | Add PDF generation (html2canvas + jsPDF)            | `src/lib/invoiceGenerator.ts` |
| **4B.4** | Add image generation                                | `src/lib/invoiceGenerator.ts` |
| **4B.5** | Create `src/lib/invoiceService.ts` — share links    | NEW FILE                      |

---

## 4C. Invoice UI - Sitter (Day 2-3)

| Task     | Description                                                                     | File Changes                                    |
| -------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| **4C.1** | Update `src/features/bookings/BookingDetailScreen.tsx` — add "Generate Invoice" | `src/features/bookings/BookingDetailScreen.tsx` |
| **4C.2** | Create `src/features/invoice/InvoicePreview.tsx`                                | NEW FILE                                        |
| **4C.3** | Add PDF download                                                                | `src/features/invoice/InvoicePreview.tsx`       |
| **4C.4** | Add image download                                                              | `src/features/invoice/InvoicePreview.tsx`       |
| **4C.5** | Add share link                                                                  | `src/features/invoice/InvoicePreview.tsx`       |

---

## 4D. Payment Close Flow (Day 3-4)

| Task     | Description                                                             | File Changes                                    |
| -------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| **4D.1** | Update `src/features/bookings/BookingDetailScreen.tsx` — "Mark as Paid" | `src/features/bookings/BookingDetailScreen.tsx` |
| **4D.2** | Create `src/features/bookings/CloseBookingSheet.tsx`                    | NEW FILE                                        |
| **4D.3** | Add tip input field                                                     | `src/features/bookings/CloseBookingSheet.tsx`   |
| **4D.4** | Add payment notes dropdown                                              | `src/features/bookings/CloseBookingSheet.tsx`   |
| **4D.5** | Add "Other" text field                                                  | `src/features/bookings/CloseBookingSheet.tsx`   |
| **4D.6** | Calculate "Total with Tip"                                              | `src/features/bookings/CloseBookingSheet.tsx`   |
| **4D.7** | Update `src/lib/bookingService.ts` — `closeBooking()`                   | `src/lib/bookingService.ts`                     |
| **4D.8** | Update `src/hooks/useBookings.ts` — `useCloseBooking()`                 | `src/hooks/useBookings.ts`                      |

---

## 4E. Client Invoice View (Day 5)

| Task     | Description                                            | File Changes                                 |
| -------- | ------------------------------------------------------ | -------------------------------------------- |
| **4E.1** | Update `src/App.tsx` — add `/invoice/:bookingId` route | `src/App.tsx`                                |
| **4E.2** | Create `src/features/invoice/ClientInvoiceView.tsx`    | NEW FILE                                     |
| **4E.3** | Add "Print" button                                     | `src/features/invoice/ClientInvoiceView.tsx` |
| **4E.4** | Show "Payment Due" if not paid                         | `src/features/invoice/ClientInvoiceView.tsx` |
| **4E.5** | Show "PAID" badge if paid                              | `src/features/invoice/ClientInvoiceView.tsx` |

---

# PHASE 5: BUSINESS METRICS DASHBOARD (10 Tasks, 3 Days)

## 5A. Metrics Calculation (Day 1)

| Task     | Description                           | File Changes                   |
| -------- | ------------------------------------- | ------------------------------ |
| **5A.1** | Create `src/lib/metricsCalculator.ts` | NEW FILE                       |
| **5A.2** | Add `calculateMonthlyRevenue`         | `src/lib/metricsCalculator.ts` |
| **5A.3** | Add `calculateOccupancyRate`          | `src/lib/metricsCalculator.ts` |
| **5A.4** | Add `calculateAverageBookingValue`    | `src/lib/metricsCalculator.ts` |
| **5A.5** | Add `getActiveDogsCount`              | `src/lib/metricsCalculator.ts` |
| **5A.6** | Add `getNewDogsThisMonth`             | `src/lib/metricsCalculator.ts` |
| **5A.7** | Add `getTopDogsByBookings`            | `src/lib/metricsCalculator.ts` |

---

## 5B. Metrics Dashboard UI (Day 2-3)

| Task     | Description                                                  | File Changes                                  |
| -------- | ------------------------------------------------------------ | --------------------------------------------- |
| **5B.1** | Create `src/features/dashboard/MetricsDashboard.tsx`         | NEW FILE                                      |
| **5B.2** | Create `src/features/dashboard/MetricCard.tsx`               | NEW FILE                                      |
| **5B.3** | Add revenue card                                             | `src/features/dashboard/MetricsDashboard.tsx` |
| **5B.4** | Add occupancy gauge                                          | `src/features/dashboard/MetricsDashboard.tsx` |
| **5B.5** | Add average booking value card                               | `src/features/dashboard/MetricsDashboard.tsx` |
| **5B.6** | Add active dogs count                                        | `src/features/dashboard/MetricsDashboard.tsx` |
| **5B.7** | Add top dogs leaderboard                                     | `src/features/dashboard/MetricsDashboard.tsx` |
| **5B.8** | Add time range selector                                      | `src/features/dashboard/MetricsDashboard.tsx` |
| **5B.9** | Update `src/features/dashboard/DashboardScreen.tsx` — toggle | `src/features/dashboard/DashboardScreen.tsx`  |

---

# PHASE 6: OFFLINE MODE + SYNC (10 Tasks, 7 Days)

## 6A. Network Detection (Day 1)

| Task     | Description                                  | File Changes                          |
| -------- | -------------------------------------------- | ------------------------------------- |
| **6A.1** | Create `src/hooks/useOnlineStatus.ts`        | NEW FILE                              |
| **6A.2** | Create `src/components/ui/OfflineBanner.tsx` | NEW FILE                              |
| **6A.3** | Update `src/components/layout/AppLayout.tsx` | `src/components/layout/AppLayout.tsx` |

---

## 6B. Mutation Queue (Day 2-3)

| Task     | Description                                          | File Changes              |
| -------- | ---------------------------------------------------- | ------------------------- |
| **6B.1** | Create `src/lib/offlineQueue.ts` — IndexedDB wrapper | NEW FILE                  |
| **6B.2** | Add `queueAdd`                                       | `src/lib/offlineQueue.ts` |
| **6B.3** | Add `queueGetAll`                                    | `src/lib/offlineQueue.ts` |
| **6B.4** | Add `queueProcess`                                   | `src/lib/offlineQueue.ts` |
| **6B.5** | Add `queueRemove`                                    | `src/lib/offlineQueue.ts` |
| **6B.6** | Add retry logic                                      | `src/lib/offlineQueue.ts` |

---

## 6C. Sync Integration (Day 4-5)

| Task     | Description                                     | File Changes                          |
| -------- | ----------------------------------------------- | ------------------------------------- |
| **6C.1** | Create `src/hooks/useOfflineSync.ts`            | NEW FILE                              |
| **6C.2** | Add sync status state                           | `src/hooks/useOfflineSync.ts`         |
| **6C.3** | Create `src/components/ui/SyncStatusBanner.tsx` | NEW FILE                              |
| **6C.4** | Integrate into AppLayout                        | `src/components/layout/AppLayout.tsx` |

---

## 6D. Query Client Integration (Day 6-7)

| Task     | Description                                               | File Changes                                       |
| -------- | --------------------------------------------------------- | -------------------------------------------------- |
| **6D.1** | Update `src/hooks/useBookings.ts` — queue mutations       | `src/hooks/useBookings.ts`                         |
| **6D.2** | Update `src/hooks/useDogs.ts` — queue mutations           | `src/hooks/useDogs.ts`                             |
| **6D.3** | Update `src/hooks/useProfile.ts` — queue mutations        | `src/hooks/useProfile.ts`                          |
| **6D.4** | Add optimistic updates                                    | `src/hooks/useBookings.ts`, `src/hooks/useDogs.ts` |
| **6D.5** | Update `src/main.tsx` — verify PersistQueryClientProvider | `src/main.tsx`                                     |

---

# PHASE 7: UX POLISH (12 Tasks, 2 Days)

## 7A. Login Improvements (Day 1)

| Task     | Description                                                        | File Changes                        |
| -------- | ------------------------------------------------------------------ | ----------------------------------- |
| **7A.1** | Update `src/features/auth/LoginScreen.tsx` — add "Remember device" | `src/features/auth/LoginScreen.tsx` |
| **7A.2** | Store device preference                                            | `src/features/auth/LoginScreen.tsx` |
| **7A.3** | Skip OTP for remembered                                            | `src/features/auth/LoginScreen.tsx` |
| **7A.4** | Add WebAuthn biometric                                             | `src/features/auth/LoginScreen.tsx` |
| **7A.5** | Handle biometric fallback                                          | `src/features/auth/LoginScreen.tsx` |

---

## 7B. Dashboard Improvements (Day 1)

| Task     | Description                                                            | File Changes                                 |
| -------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| **7B.1** | Update `src/features/dashboard/DashboardScreen.tsx` — "Arrived" button | `src/features/dashboard/DashboardScreen.tsx` |
| **7B.2** | Add quick-call button                                                  | `src/features/dashboard/DashboardScreen.tsx` |
| **7B.3** | Add visual badges for special needs                                    | `src/features/dashboard/DashboardScreen.tsx` |
| **7B.4** | Add "View Details" navigation                                          | `src/features/dashboard/DashboardScreen.tsx` |

---

## 7C. Booking Flow Improvements (Day 1-2)

| Task     | Description                                                         | File Changes                                   |
| -------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| **7C.1** | Update `src/features/bookings/CreateBookingSheet.tsx` — notes field | `src/features/bookings/CreateBookingSheet.tsx` |
| **7C.2** | Add pickup time picker                                              | `src/features/bookings/CreateBookingSheet.tsx` |
| **7C.3** | Add dropoff time picker                                             | `src/features/bookings/CreateBookingSheet.tsx` |
| **7C.4** | Update `src/lib/bookingService.ts` — store times                    | `src/lib/bookingService.ts`                    |

---

## 7D. Profile Improvements (Day 2)

| Task     | Description                                                   | File Changes                             |
| -------- | ------------------------------------------------------------- | ---------------------------------------- |
| **7D.1** | Update `src/features/profile/profileService.ts` — logo upload | `src/features/profile/profileService.ts` |
| **7D.2** | Update `src/features/profile/ProfileScreen.tsx` — logo button | `src/features/profile/ProfileScreen.tsx` |
| **7D.3** | Add "Payment Instructions" field                              | `src/features/profile/ProfileScreen.tsx` |
| **7D.4** | Update `src/lib/invoiceTemplate.ts` — display logo            | `src/lib/invoiceTemplate.ts`             |
| **7D.5** | Update `src/lib/invoiceTemplate.ts` — display payment info    | `src/lib/invoiceTemplate.ts`             |

---

# Execution Strategy

## Parallel Execution Groups

| Group             | Tasks                  | Can Run In Parallel        |
| ----------------- | ---------------------- | -------------------------- |
| **DB Setup**      | 1A, 2A, 3A, 4A, 5A     | All DB migrations together |
| **Core Services** | 1B, 2B, 3B, 4B, 6B     | Shared utilities           |
| **Client Portal** | 1C, 1D, 1E, 1F, 1G, 1H | All client features        |
| **Reports**       | 2C, 2D, 2E             | Report features            |
| **Recurring**     | 3C, 3D                 | Recurring features         |
| **Invoice**       | 4C, 4D, 4E             | Invoice + payment          |
| **Metrics**       | 5B                     | Dashboard UI               |
| **Offline**       | 6A, 6C, 6D             | Network + sync             |
| **UX**            | 7A, 7B, 7C, 7D         | Polish tasks               |

## Recommended Start Order

1. **Day 1**: Run all SQL migrations (1A, 2A, 3A, 4A)
2. **Days 2-3**: Core services (1B, 2B, 3B, 4B, 6B)
3. **Days 4-10**: Client Portal (1C-1H)
4. **Days 11-15**: Reports (2C-2E)
5. **Days 16-20**: Recurring (3C-3D)
6. **Days 21-25**: Invoice + Payment (4C-4E)
7. **Days 26-28**: Metrics (5B)
8. **Days 29-35**: Offline (6A-6D)
9. **Days 36-37**: UX Polish (7A-7D)
