-- profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  business_name text,
  display_name text,
  email text,
  nightly_rate decimal(10,2) not null default 0,
  daycare_rate decimal(10,2) not null default 0,
  holiday_surcharge decimal(10,2) not null default 0,
  cutoff_time time not null default '11:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- dogs
create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  sitter_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  breed text,
  owner_name text,
  owner_phone text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  sitter_id uuid not null references public.profiles(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  type text not null check (type in ('boarding', 'daycare')),
  is_holiday boolean not null default false,
  status text not null check (status in ('active', 'completed', 'cancelled')) default 'active',
  total_amount decimal(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- booking_days
create table public.booking_days (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  date date not null,
  rate_type text not null check (rate_type in ('boarding', 'daycare')),
  is_holiday boolean not null default false,
  amount decimal(10,2) not null default 0,
  notes text,
  unique(booking_id, date)
);
