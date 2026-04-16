-- Soft delete support for dogs.
-- Instead of hard-deleting dog rows (which would violate the bookings.dog_id RESTRICT constraint
-- on dogs with completed stays), we set archived_at to hide them from the UI while preserving
-- all booking history and financial metrics.
ALTER TABLE public.dogs ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
