> ARCHIVED: superseded by `docs/phase-2-implementation-plan.md` and current-state docs (`docs/architecture.md`, `docs/tech-debt.md`).

Snapuppy Phase 2 - Complete Implementation Plan
Updated Architecture
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE BACKEND │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│ profiles │ bookings │ daily*reports│ recurring* │
│ +client* │ +source │ │ bookings │
│ token │ +paid* │ │ │
│ │ +paid_at │ │ │
│ │ +tips │ │ │
└──────────────┴──────────────┴──────────────┴─────────────────┘

---

📋 Complete Feature Breakdown
Phase 1: Client Portal + Quick Add (10 days)
Component Description
Database client_token, client_token_expires, source column
Sitter Share Profile screen "Share" button generates unique token link
Client Auth /client/:token → verify name + phone against dog owner
Client Dashboard View own dog's past/upcoming bookings
Client Request Simplified form: select dog, dates, notes
Sitter View Client requests appear as "pending" in Bookings
Quick Add Sitter can quick-add manual booking (source='manual')

---

Phase 2: Daily Report Cards (5 days)
Component Description
Database daily_reports table with photos, notes, potty, meals, behavior
Sitter Entry "Add Report" button in active booking → photo upload + fields
Client View See reports in their booking detail
Storage Reuse existing dog-photos bucket

---

Phase 3: Recurring Bookings (5 days)
Component Description
Database recurring_bookings table
Sitter Setup Define available recurring slots (e.g., Mon/Wed weekly)
Client Booking Toggle "Recurring" → select pattern
Auto-Create Pre-generate 3 months of bookings on save

---

Phase 4: Invoice + Payment Close (5 days)
Component Description
Invoice Generation PDF/Image generation from booking data
Shareable Link Client can view invoice via link without login
Payment Close Flow Sitter marks as "Paid" → adds optional tip → closes booking
Tip Field Manual tip entry before closing
Revenue Calc Include tips in metrics (total revenue = booking + tips)
Invoice Contents:

- Sitter business name + logo
- Client/dog info
- Booking dates + breakdown
- Subtotal, tip, total
- Payment status
- Sitter contact + payment instructions (Venmo/CashApp/Zelle)

---

Phase 5: Business Metrics Dashboard (3 days)
Metric Calculation
Monthly Revenue SUM(booking.total_amount + tips) this month
Occupancy Rate (booked_nights / 30) × 100
Average Booking Value total_revenue / total_bookings
Active Dogs COUNT active bookings
New Dogs This Month COUNT dogs created this month
Top Dogs Most bookings by dog

---

Phase 6: Offline Mode + Sync (7 days)
Component Description
Network Hook useOnlineStatus.ts - detects online/offline
Offline Banner Shows "You're offline" when disconnected
Mutation Queue Store pending creates/updates in IndexedDB
Sync on Reconnect Process queue when back online
Optimistic UI Show success immediately, rollback if fails

---

Phase 7: UX Polish (2 days)
Fix Location
Remember device checkbox LoginScreen
Biometric auth (Face ID) LoginScreen
Quick actions (call owner) DashboardScreen
Check-in button DashboardScreen
Booking notes field CreateBookingSheet
Pickup time picker CreateBookingSheet
Business logo upload ProfileScreen

---

📊 Total Timeline
Phase Days Cumulative

1. Client Portal + Quick Add 10 10
2. Daily Reports 5 15
3. Recurring Bookings 5 20
4. Invoice + Payment Close 5 25
5. Metrics Dashboard 3 28
6. Offline Mode 7 35
7. UX Polish 2 37 days

---

🔧 Database Schema (Complete)
-- PROFILES - client access
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS client_token_expires TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_logo_url TEXT;
-- BOOKINGS - source + payment tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_notes TEXT;
-- DAILY REPORTS
CREATE TABLE daily_reports (
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
-- RECURRING BOOKINGS
CREATE TABLE recurring_bookings (
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
-- RLS
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

---

📁 New File Structure
src/
├── features/
│ ├── client/ # NEW
│ │ ├── ClientAuthScreen.tsx
│ │ ├── ClientDashboard.tsx
│ │ └── ClientRequestSheet.tsx
│ ├── reports/ # NEW
│ │ ├── ReportSheet.tsx
│ │ └── ReportList.tsx
│ ├── recurring/ # NEW
│ │ └── RecurringAvailability.tsx
│ ├── invoice/ # NEW
│ │ ├── InvoiceGenerator.ts
│ │ └── InvoiceView.tsx
│ ├── dashboard/
│ │ └── MetricsDashboard.tsx # NEW
│ └── bookings/
│ └── CloseBookingSheet.tsx # NEW - payment close flow
├── hooks/
│ ├── useOnlineStatus.ts # NEW
│ ├── useOfflineSync.ts # NEW
│ ├── useReports.ts # NEW
│ └── useRecurring.ts # NEW
└── lib/
├── sync.ts # NEW - offline sync logic
├── offlineQueue.ts # NEW - mutation queue
└── invoiceGenerator.ts # NEW - PDF generation

---

🚀 Ready to Build?
This plan covers:

- ✅ Client portal with phone verification
- ✅ Quick add for manual bookings
- ✅ Daily report cards with photos
- ✅ Recurring bookings (pre-create 3 months)
- ✅ Invoice generation (PDF + shareable link)
- ✅ Payment close with tips
- ✅ Revenue metrics
- ✅ Offline-first with sync
- ✅ UX polish
