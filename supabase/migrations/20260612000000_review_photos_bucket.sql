-- Storage bucket for cafe review photos.
--
-- Review photos were previously persisted as device-local file:// URIs, which
-- break on other devices and disappear when the OS clears its cache. This
-- creates a public bucket so uploaded photos get durable, publicly readable
-- URLs that are stored in reviews.photos.

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- Anyone can read review photos (they are shown on public cafe screens).
drop policy if exists "Review photos are publicly readable" on storage.objects;
create policy "Review photos are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'review-photos');

-- Authenticated users may upload only into a folder named after their own uid,
-- e.g. `<auth.uid()>/<timestamp>-<n>.jpg`.
drop policy if exists "Users can upload their own review photos" on storage.objects;
create policy "Users can upload their own review photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to manage (replace/remove) their own uploaded review photos.
drop policy if exists "Users can update their own review photos" on storage.objects;
create policy "Users can update their own review photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own review photos" on storage.objects;
create policy "Users can delete their own review photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
