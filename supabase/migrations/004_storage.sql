-- Create dog-photos bucket
insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', true);

-- RLS: authenticated users can upload to their own folder
create policy "dog-photos: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can read (public bucket — photos used in UI)
create policy "dog-photos: read all" on storage.objects
  for select using (bucket_id = 'dog-photos');

-- RLS: owner can delete their own
create policy "dog-photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dog-photos' and (storage.foldername(name))[1] = auth.uid()::text);
