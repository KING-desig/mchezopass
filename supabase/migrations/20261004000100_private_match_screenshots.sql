insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-screenshots',
  'match-screenshots',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update public.matches
set screenshot_url = regexp_replace(
  screenshot_url,
  '^https?://[^/]+/storage/v1/object/public/match-screenshots/',
  ''
)
where screenshot_url ~ '^https?://[^/]+/storage/v1/object/public/match-screenshots/.+';

drop policy if exists "Match participants upload proof" on storage.objects;
create policy "Match participants upload proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'match-screenshots'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
    from public.matches as match
    join public.team_members as member
      on member.team_id = match.team_a_id or member.team_id = match.team_b_id
    where match.id::text = (storage.foldername(name))[1]
      and member.user_id = auth.uid()
  )
);

drop policy if exists "Match participants and admins read proof" on storage.objects;
create policy "Match participants and admins read proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'match-screenshots'
  and exists (
    select 1
    from public.matches as match
    where match.id::text = (storage.foldername(name))[1]
      and (
        exists (
          select 1
          from public.team_members as member
          where (member.team_id = match.team_a_id or member.team_id = match.team_b_id)
            and member.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.profiles as profile
          where profile.id = auth.uid() and profile.is_admin = true
        )
      )
  )
);

drop policy if exists "Uploader deletes own match proof" on storage.objects;
create policy "Uploader deletes own match proof"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'match-screenshots'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
    from public.matches as match
    join public.team_members as member
      on member.team_id = match.team_a_id or member.team_id = match.team_b_id
    where match.id::text = (storage.foldername(name))[1]
      and member.user_id = auth.uid()
  )
);