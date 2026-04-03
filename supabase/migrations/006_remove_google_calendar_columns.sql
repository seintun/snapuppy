alter table public.bookings
drop column if exists gcal_event_id;

alter table public.profiles
drop column if exists gcal_calendar_id;
