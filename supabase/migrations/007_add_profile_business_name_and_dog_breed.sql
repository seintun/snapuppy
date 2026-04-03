alter table public.profiles
add column if not exists business_name text;

alter table public.dogs
add column if not exists breed text;
