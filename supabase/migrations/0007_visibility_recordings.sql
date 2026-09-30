-- Profile visibility controls, talk recordings, and one privilege fix.
--
-- 1. profiles.visibility — a member decides, per field, what the rest of the
--    cohort (and the public showcase) gets to see. Stored as jsonb merged over
--    DEFAULT_VISIBILITY in src/lib/profile.ts, so adding a field later needs no
--    migration. Empty '{}' means "all defaults", which is today's behaviour.
--
-- 2. talks.recording_url — after a session the speaker shares the recording.
--    Kept on the talk rather than the profile because the talk is the thing
--    that was recorded, and a member may present again in a later season.
--
-- 3. A trigger closing an existing hole in profiles_update_own (see below).
--
-- Re-runnable, like every migration here. Paste into the Supabase SQL editor.

alter table public.profiles add column if not exists visibility jsonb not null default '{}'::jsonb;

alter table public.talks add column if not exists recording_url text;
alter table public.talks add column if not exists recording_added_at timestamptz;
alter table public.talks add column if not exists recording_added_by uuid
  references public.profiles (id) on delete set null;

-- 4. talks.ratings_open — scoring is a moderated window, not something that
--    opens the moment a talk is approved. The admin opens it once the talk has
--    actually been given and closes it by hand when the room is done. Default
--    false: a newly approved talk is not rateable until someone says so.
alter table public.talks add column if not exists ratings_opened_at timestamptz;
alter table public.talks add column if not exists ratings_closed_at timestamptz;

-- The backfill has to happen only on the very first run: approved talks that
-- already existed keep behaving as they did, rather than having scoring shut
-- off mid-season. A plain `update ... where status = 'approved'` would be
-- wrong on a re-run, since by then it would also re-open every talk the
-- curator has deliberately left closed. Gating on the column not existing yet
-- is what makes this file safe to paste twice.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'talks'
      and column_name = 'ratings_open'
  ) then
    alter table public.talks add column ratings_open boolean not null default false;
    update public.talks set ratings_open = true, ratings_opened_at = now()
      where status = 'approved';
  end if;
end $$;

-- The window has to be enforced in the policy too, not just in /api/ratings:
-- `ratings` is directly writable by authenticated users under RLS, so a closed
-- window that only the route checks could be bypassed with the anon key.
drop policy if exists ratings_insert_eligible on public.ratings;
create policy ratings_insert_eligible
  on public.ratings for insert
  to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1
      from public.talks t
      where t.id = talk_id
        and t.status = 'approved'
        and t.ratings_open
        and t.presenter_id <> auth.uid()
    )
  );

-- Editing your own score is part of the same window: once it closes, what the
-- room said is settled.
drop policy if exists ratings_update_own on public.ratings;
create policy ratings_update_own
  on public.ratings for update
  to authenticated
  using (rater_id = auth.uid())
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.talks t where t.id = talk_id and t.ratings_open
    )
  );

-- profiles_update_own (0001) is `for update using (id = auth.uid())` with no
-- column restriction, so a member holding the anon key can set their own
-- profiles.role to 'admin'. public.is_admin() reads that column, so until the
-- next sign-in rewrites it from the admins table, they really are an admin.
--
-- RLS has no column-level form, so the check goes in a trigger. Members write
-- one more column through that same policy now (visibility), which is what
-- makes this worth closing here.
--
-- Both legitimate role writers -- auth/callback and PATCH /api/admin/members/[id]
-- -- use the service-role client, so service-role passes straight through and
-- keeps its authorization in application code. This only constrains the
-- anon/authenticated path, which is the one that was open.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  if jwt_role = 'service_role'
     or session_user in ('postgres', 'service_role', 'supabase_admin')
  then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'role is not yours to change';
  end if;

  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'identity columns are not editable';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row
  execute function public.guard_profile_privileged_columns();
