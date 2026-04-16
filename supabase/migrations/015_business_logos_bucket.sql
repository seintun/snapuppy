-- Create business-logos bucket
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- RLS: authenticated users can upload to their own folder
create policy "business-logos: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can read (public bucket — logo used in UI and client portal)
create policy "business-logos: read all" on storage.objects
  for select using (bucket_id = 'business-logos');

-- RLS: owner can update (upsert) their own
create policy "business-logos: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: owner can delete their own
create policy "business-logos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);
