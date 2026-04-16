ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS invoice_overrides JSONB;
