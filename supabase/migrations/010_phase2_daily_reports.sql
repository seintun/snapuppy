CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photos TEXT[],
  notes TEXT,
  potty_status TEXT CHECK (potty_status IN ('good', 'accident', 'none_out')),
  meals_given TEXT[],
  behavior TEXT,
  medications_given TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (booking_id, date)
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sitter can manage reports for own bookings" ON daily_reports;
CREATE POLICY "Sitter can manage reports for own bookings"
ON daily_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM bookings
    WHERE bookings.id = daily_reports.booking_id
      AND bookings.sitter_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM bookings
    WHERE bookings.id = daily_reports.booking_id
      AND bookings.sitter_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guests can read reports for guest bookings" ON daily_reports;
CREATE POLICY "Guests can read reports for guest bookings"
ON daily_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM bookings
    JOIN profiles ON profiles.id = bookings.sitter_id
    WHERE bookings.id = daily_reports.booking_id
      AND profiles.is_guest = true
  )
);
