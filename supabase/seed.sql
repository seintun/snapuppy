-- Dev seed: test sitter profile with sample rates.
-- Safe no-op when this auth user does not exist.

insert into public.profiles (
  id,
  display_name,
  email,
  business_name,
  nightly_rate,
  daycare_rate,
  holiday_boarding_rate,
  holiday_daycare_rate,
  cutoff_time
)
select
  u.id,
  'Test Sitter',
  'test@snapuppy.dev',
  'Happy Paws Dev',
  55.00,
  35.00,
  70.00,
  45.00,
  '11:00'
from auth.users as u
where u.id = '00000000-0000-0000-0000-000000000001'
on conflict (id) do nothing;
