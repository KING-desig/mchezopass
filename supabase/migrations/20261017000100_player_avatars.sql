alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_preset text not null default 'rookie';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-avatars',
  'player-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Players read avatars" on storage.objects;
create policy "Players read avatars"
on storage.objects
for select
to public
using (bucket_id = 'player-avatars');

drop policy if exists "Players upload own avatar" on storage.objects;
create policy "Players upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'player-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Players update own avatar" on storage.objects;
create policy "Players update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'player-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'player-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Players delete own avatar" on storage.objects;
create policy "Players delete own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'player-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
