-- Server-side authorization and secure state transitions.

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.ratings enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.lfg_posts enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

create or replace function public.protect_profile_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'Only administrators may change administrator privileges';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin on public.profiles;
create trigger protect_profile_admin
before update on public.profiles
for each row execute function public.protect_profile_admin();

-- Privilege-safe profile policies.
drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles" on public.profiles for select to public using (true);
drop policy if exists "Players update own profile" on public.profiles;
create policy "Players update own profile" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "Players insert own profile" on public.profiles;
create policy "Players insert own profile" on public.profiles for insert to authenticated
with check (id = auth.uid() and coalesce(is_admin, false) = false);

-- Public discovery, but ownership-controlled writes.
drop policy if exists "Public read teams" on public.teams;
create policy "Public read teams" on public.teams for select to public using (true);
drop policy if exists "Captains create teams" on public.teams;
create policy "Captains create teams" on public.teams for insert to authenticated with check (captain_id = auth.uid());
drop policy if exists "Captains update teams" on public.teams;
create policy "Captains update teams" on public.teams for update to authenticated
using (captain_id = auth.uid() or public.is_admin()) with check (captain_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.matches from anon, authenticated;
drop policy if exists "Participants read matches" on public.matches;
create policy "Participants read matches" on public.matches for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.team_members where user_id = auth.uid() and (team_id = team_a_id or team_id = team_b_id))
);

-- Match RPCs are the only allowed way to mutate match state.
create or replace function public.create_match(p_team_a uuid, p_team_b uuid, p_event uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Only administrators may create matches'; end if;
  if p_team_a = p_team_b then raise exception 'A team cannot play itself'; end if;
  insert into public.matches(team_a_id, team_b_id, event_id, status)
  values(p_team_a, p_team_b, p_event, 'pending') returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.claim_match(p_match_id uuid, p_screenshot_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_match public.matches%rowtype; v_team uuid;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'pending' then raise exception 'Match is not awaiting a claim'; end if;
  select team_id into v_team from public.team_members
    where user_id = auth.uid() and team_id in (v_match.team_a_id, v_match.team_b_id)
    limit 1;
  if v_team is null then raise exception 'You are not a participant in this match'; end if;
  if p_screenshot_path is null or split_part(p_screenshot_path, '/', 1) <> p_match_id::text
     or split_part(p_screenshot_path, '/', 2) <> auth.uid()::text then
    raise exception 'Invalid match proof path';
  end if;
  update public.matches set status='awaiting_confirmation', winner_id=v_team,
    screenshot_url=p_screenshot_path, updated_at=now() where id=p_match_id;
end;
$$;

create or replace function public.confirm_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_match public.matches%rowtype; v_confirming_team uuid;
begin
  select * into v_match from public.matches where id=p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'awaiting_confirmation' or v_match.winner_id is null then raise exception 'Match is not awaiting confirmation'; end if;
  select team_id into v_confirming_team from public.team_members
    where user_id=auth.uid() and team_id in(v_match.team_a_id,v_match.team_b_id)
      and team_id <> v_match.winner_id limit 1;
  if v_confirming_team is null then raise exception 'Only the opposing team may confirm this result'; end if;
  update public.matches set status=(case when v_match.winner_id=v_match.team_a_id then 'team_a_win' else 'team_b_win' end), updated_at=now()
  where id=p_match_id;
end;
$$;

create or replace function public.dispute_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id=p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'awaiting_confirmation' then raise exception 'Match cannot be disputed in its current state'; end if;
  if not exists(select 1 from public.team_members where user_id=auth.uid() and team_id in(v_match.team_a_id,v_match.team_b_id)) then
    raise exception 'Only a participant may dispute this match'; end if;
  update public.matches set status='disputed', updated_at=now() where id=p_match_id;
end;
$$;

create or replace function public.resolve_match(p_match_id uuid, p_winner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_match public.matches%rowtype;
begin
  if not public.is_admin() then raise exception 'Only administrators may resolve disputes'; end if;
  select * into v_match from public.matches where id=p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'disputed' then raise exception 'Match is not disputed'; end if;
  if p_winner not in(v_match.team_a_id,v_match.team_b_id) then raise exception 'Winner must be a match participant'; end if;
  update public.matches set status=(case when p_winner=v_match.team_a_id then 'team_a_win' else 'team_b_win' end), winner_id=p_winner, updated_at=now()
  where id=p_match_id;
end;
$$;

revoke all on function public.create_match(uuid,uuid,uuid) from public;
revoke all on function public.claim_match(uuid,text) from public;
revoke all on function public.confirm_match(uuid) from public;
revoke all on function public.dispute_match(uuid) from public;
revoke all on function public.resolve_match(uuid,uuid) from public;
grant execute on function public.create_match(uuid,uuid,uuid) to authenticated;
grant execute on function public.claim_match(uuid,text) to authenticated;
grant execute on function public.confirm_match(uuid) to authenticated;
grant execute on function public.dispute_match(uuid) to authenticated;
grant execute on function public.resolve_match(uuid,uuid) to authenticated;

-- Rating constraints and server-side eligibility checks.
delete from public.ratings a
using public.ratings b
where a.rater_id = b.rater_id
  and a.rated_id = b.rated_id
  and a.ctid < b.ctid;
drop index if exists public.ratings_rater_rated_unique;
create unique index ratings_rater_rated_unique on public.ratings(rater_id, rated_id);

alter table public.ratings drop constraint if exists ratings_score_check;
alter table public.ratings add constraint ratings_score_check check(score between 1 and 5);

create or replace function public.submit_rating(p_rated_id uuid, p_score integer, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if auth.uid() = p_rated_id then raise exception 'Self-ratings are not allowed'; end if;
  if p_score between 1 and 5 is not true then raise exception 'Rating must be between 1 and 5'; end if;
  if not exists (
    select 1 from public.team_members a join public.team_members b on a.team_id=b.team_id
    where a.user_id=auth.uid() and b.user_id=p_rated_id
  ) then raise exception 'You may only rate players who shared a team'; end if;
  insert into public.ratings(rater_id,rated_id,score,comment)
  values(auth.uid(),p_rated_id,p_score,left(coalesce(p_comment,''),1000));
end;
$$;
revoke all on function public.submit_rating(uuid,integer,text) from public;
grant execute on function public.submit_rating(uuid,integer,text) to authenticated;
revoke insert, update, delete on public.ratings from anon, authenticated;

drop policy if exists "Public read ratings" on public.ratings;
create policy "Public read ratings" on public.ratings for select to public using (true);

-- Prevent unsafe external links from new and existing application data.
alter table public.teams drop constraint if exists teams_whatsapp_https_check;
alter table public.teams add constraint teams_whatsapp_https_check
check (coalesce(whatsapp_link,'')='' or whatsapp_link ~ '^https://(wa\.me/[^[:space:]]+|chat\.whatsapp\.com/[^[:space:]]+|www\.whatsapp\.com/[^[:space:]]+)');

alter table public.lfg_posts drop constraint if exists lfg_whatsapp_https_check;
alter table public.lfg_posts add constraint lfg_whatsapp_https_check
check (coalesce(whatsapp_link,'')='' or whatsapp_link ~ '^https://(wa\.me/[^[:space:]]+|chat\.whatsapp\.com/[^[:space:]]+|www\.whatsapp\.com/[^[:space:]]+)');

alter table public.events drop constraint if exists events_whatsapp_https_check;
alter table public.events add constraint events_whatsapp_https_check
check (coalesce(whatsapp_link,'')='' or whatsapp_link ~ '^https://(wa\.me/[^[:space:]]+|chat\.whatsapp\.com/[^[:space:]]+|www\.whatsapp\.com/[^[:space:]]+)');

-- Basic public/team data policies needed by existing pages.
drop policy if exists "Public read lfg posts" on public.lfg_posts;
create policy "Public read lfg posts" on public.lfg_posts for select to public using (true);
drop policy if exists "Users create own lfg posts" on public.lfg_posts;
create policy "Users create own lfg posts" on public.lfg_posts for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "Users delete own lfg posts" on public.lfg_posts;
create policy "Users delete own lfg posts" on public.lfg_posts for delete to authenticated using (user_id=auth.uid() or public.is_admin());

drop policy if exists "Public read events" on public.events;
create policy "Public read events" on public.events for select to public using (true);
drop policy if exists "Users create events" on public.events;
create policy "Users create events" on public.events for insert to authenticated with check (organizer_id=auth.uid());

drop policy if exists "Public read event participants" on public.event_participants;
create policy "Public read event participants" on public.event_participants for select to public using (true);
drop policy if exists "Users join events" on public.event_participants;
create policy "Users join events" on public.event_participants for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "Users leave events" on public.event_participants;
create policy "Users leave events" on public.event_participants for delete to authenticated using (user_id=auth.uid() or public.is_admin());

drop policy if exists "Public read team members" on public.team_members;
create policy "Public read team members" on public.team_members for select to public using (true);
drop policy if exists "Users join their own team membership" on public.team_members;
create policy "Users join their own team membership" on public.team_members for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.teams
    where teams.id = team_id
      and (teams.captain_id = auth.uid() or team_members.role = 'member')
  )
);
drop policy if exists "Users leave team membership" on public.team_members;
create policy "Users leave team membership" on public.team_members for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

