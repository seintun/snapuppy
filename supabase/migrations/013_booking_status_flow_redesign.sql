BEGIN;

UPDATE public.bookings
SET status = 'upcoming'
WHERE status = 'pending';

UPDATE public.bookings
SET status = 'paid'
WHERE status = 'completed';

UPDATE public.bookings
SET
  is_paid = true,
  paid_at = COALESCE(paid_at, updated_at, created_at)
WHERE status = 'paid';

UPDATE public.bookings
SET is_paid = false
WHERE status IN ('upcoming', 'active', 'awaiting', 'cancelled')
  AND is_paid IS DISTINCT FROM false;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'bookings'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE public.bookings
ALTER COLUMN status SET DEFAULT 'upcoming';

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check
CHECK (status IN ('upcoming', 'active', 'awaiting', 'paid', 'cancelled'));

COMMIT;
