-- Storage bucket for user avatar images.
--
-- Until now profile_image_url was only ever populated from the Google/Apple auth
-- metadata. The Edit Profile screen lets users pick and upload their own avatar,
-- so this creates a public bucket whose objects are scoped per-user (folder named
-- after the owner's uid), mirroring the review-photos bucket policies.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Avatars are shown across public profile/activity surfaces.
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Authenticated users may upload only into a folder named after their own uid,
-- e.g. `<auth.uid()>/avatar-<timestamp>.jpg`.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
