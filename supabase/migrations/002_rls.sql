-- Enable RLS
alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_days enable row level security;

-- profiles: user can only access their own profile
create policy "profiles: own row" on public.profiles
  for all using (id = auth.uid());

-- dogs: sitter can only access their own dogs
create policy "dogs: own rows" on public.dogs
  for all using (sitter_id = auth.uid());

-- bookings: sitter can only access their own bookings
create policy "bookings: own rows" on public.bookings
  for all using (sitter_id = auth.uid());

-- booking_days: accessible if the parent booking belongs to the sitter
create policy "booking_days: own rows" on public.booking_days
  for all using (
    booking_id in (
      select id from public.bookings where sitter_id = auth.uid()
    )
  );
