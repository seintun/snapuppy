-- Dev seed: test sitter profile with sample rates
-- Run after migrations. Requires a user to exist in auth.users with this id.
-- Replace the UUID below with your local dev user id from the Supabase dashboard.

insert into public.profiles (
  id,
  display_name,
  email,
  nightly_rate,
  daycare_rate,
  holiday_surcharge,
  cutoff_time
) values (
  '00000000-0000-0000-0000-000000000001',
  'Test Sitter',
  'test@snapuppy.dev',
  55.00,
  35.00,
  15.00,
  '11:00'
) on conflict (id) do nothing;
