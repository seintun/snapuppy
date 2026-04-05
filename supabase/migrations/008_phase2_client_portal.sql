-- Phase 2 Migration: Client Portal + Quick Add
-- Run order: 008

-- 1A.1: Add client token columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS client_token TEXT,
ADD COLUMN IF NOT EXISTS client_token_expires TIMESTAMP;

-- 1A.2: Add booking source column
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 2A.1: Create daily_reports table
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

-- 3A.1: Create recurring_bookings table
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

-- 4A.1: Add payment tracking to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- 4A.2: Add business logo to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

-- Enable RLS on new tables
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_reports
CREATE POLICY "Owners can manage own daily_reports" ON daily_reports
  FOR ALL USING (true);

-- RLS Policies for recurring_bookings
CREATE POLICY "Owners can manage own recurring_bookings" ON recurring_bookings
  FOR ALL USING (true);