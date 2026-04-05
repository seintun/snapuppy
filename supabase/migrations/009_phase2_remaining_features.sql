ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS client_token TEXT,
ADD COLUMN IF NOT EXISTS client_token_expires TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS business_logo_url TEXT;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

CREATE TABLE IF NOT EXISTS recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  repeat_days TEXT[] NOT NULL DEFAULT '{}',
  repeat_pattern TEXT NOT NULL CHECK (repeat_pattern IN ('weekly', 'biweekly', 'monthly')),
  time_slot_start TIME,
  time_slot_end TIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sitter can manage own recurring bookings" ON recurring_bookings;
CREATE POLICY "Sitter can manage own recurring bookings"
ON recurring_bookings
FOR ALL
USING (sitter_id = auth.uid())
WITH CHECK (sitter_id = auth.uid());
