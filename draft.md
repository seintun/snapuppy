# snapuppy.life — Design Specification

**Status:** Draft | **Date:** 2026-04-02 | **Author:** BlueprintGrill (Gemini)

## 1. Executive Summary

**snapuppy.life** is a boutique, one-handed mobile OS for independent dog sitters. It combines a professional financial ledger with a fun, "Bento-style" daily reporting engine. By prioritizing privacy (local media) and reliability (cloud-synced data), it serves as the "Command Center" for high-end pet care businesses.

## 2. Core Objectives

- **Zero-Friction Logging:** One-handed operation for sitters managing multiple dogs.
- **Privacy-First Media:** All pet photos stay in a native "Dog Sitter" album, never hitting the cloud.
- **Financial Integrity:** Automated "Night vs. Day" revenue calculation with manual override flexibility.
- **2026 Aesthetic:** A modern "Bento Grid" report card that parents love to share.

---

## 3. Technical Architecture

### 3.1 Stack

- **Frontend:** Hybrid PWA built with **Capacitor** (for native Bridge access).
- **Backend/Database:** **Supabase** (PostgreSQL) for pet profiles, booking history, and revenue ledger.
- **Media Handling:** **Capacitor FileSystem** + **OffscreenCanvas** for on-device image processing.
- **Sync:** **Google Calendar API** (Batch-push for schedule mirroring).

### 3.2 System Diagrams (Logic)

- **The Ledger Formula:**
  Total revenue $R$ is calculated as the sum of daily rates $d$ plus tips $t$ and discounts $s$:
  $$R = \sum_{i=1}^{n} (d_i) + t - s$$
  Where $d_i$ is automatically determined by the **Hard Cutoff Logic** (Boarding vs. Daycare) but remains manually editable.

---

## 4. Feature Specifications

### 4.1 The "Bento" Report Engine

- **Input:** Manual selection of 4 photos from the native "Dog Sitter" gallery.
- **Processing:** On-device `OffscreenCanvas` auto-crops photos to edge-to-edge Bento modules.
- **Tally Counters:** Haptic-enabled "+" and "-" icons for:
  - 💩 Poops
  - 💧 Pees
  - 🦴 Meals
  - 🎾 Play Sessions
- **Output:** A single 2000px square "Bento Grid" image saved to the gallery and shared via the Native Share Sheet.

### 4.2 The Financial Ledger & Calendar

- **New Booking Flow:** Form in-app creates a entry in Supabase and "mirrors" it to Google Calendar.
- **Daily Breakdown:** A collapsible accordion showing every day of a stay.
- **Status Toggle:** Each day can be toggled between "Boarding" (Nightly) and "Daycare" (Daily).
- **Holiday Logic:** A "Global Holiday Toggle" that applies a markup to the entire stay with manual per-day overrides.
- **Check-out Cutoff:** Configurable time (e.g., 11:00 AM). If pick-up is after this time, a "Daycare" rate is automatically appended to the final stay day.

### 4.3 Navigation & UI

- **Bottom Tab Bar:** Schedule, New Booking, Reports, Financials.
- **Haptics:** Strong feedback for tally increments and successful "Bento" bakes.
- **Typography:** Bold, hero-style headers for pet names; minimal clutter for data fields.

---

## 5. Data Model (Supabase)

- **Profiles:** `pet_id`, `owner_name`, `pet_name`, `notes`, `base_rate`.
- **Bookings:** `booking_id`, `pet_id`, `start_date`, `end_date`, `type` (Boarding/Daycare), `gcal_event_id`.
- **LedgerItems:** `item_id`, `booking_id`, `date`, `rate_applied`, `is_holiday`, `manual_override_note`.
- **RevenueHistory:** Aggregated table for monthly/yearly tax reporting.

---

## 6. Security & Privacy

- **No Cloud Images:** Native gallery access only; the app stores only file paths (Local URIs) to pet photos.
- **Auth:** Secure login via Supabase Auth (Email/Google).
- **Data Safety:** All ledger data is synced to Supabase to prevent loss if the phone is destroyed.

---

## 7. Implementation Phasing (Mental Model)

1. **Phase 1:** Capacitor + Supabase boilerplate & Auth.
2. **Phase 2:** Booking Ledger & Google Calendar Mirroring.
3. **Phase 3:** On-device Canvas "Bento" Engine & Media Picker.
4. **Phase 4:** Financial Reporting & History Dashboard.
