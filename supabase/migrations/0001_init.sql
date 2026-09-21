-- ============================================================================
-- Curaious — Season 1 schema (auth, invites, calendar, talks, ratings)
-- Run this once in the Supabase SQL editor.
--
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- !!  BEFORE YOU RUN THIS: scroll to the bottom ("seed: admin invite") and  !!
-- !!  replace REPLACE_WITH_ADMIN_EMAIL@example.com with your real email.    !!
-- !!  That invite row is the ONLY way to get an admin account — magic-link  !!
-- !!  login is gated on the invites table, and role comes from the invite.  !!
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--
-- Security model
--   * RLS is enabled on every table.
--   * `select` policies are permissive enough for the browser to read what it
--     is allowed to see directly.
--   * Every write that carries a business rule (claiming a slot, approving a
--     talk, rating a talk, adding an invite) goes through a server route using
--     the service-role client. The DB constraints below are the final
--     race-condition backstop.
--   * `invites` has NO policies for the `authenticated` role at all, so it is
--     default-deny: the login gate can't be probed from the browser and the
--     invite list never leaks to it.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- One row per person who has actually logged in. Created by /auth/callback
-- with the service-role client from the matching invites row — never inserted
-- from the browser.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        text not null default 'member' check (role in ('member', 'admin')),
  created_at  timestamptz not null default now()
);

-- is_admin(): used inside RLS policies. security definer so it can read
-- profiles without re-entering profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- admins
-- Admin accounts verified via Google OAuth.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  name            text not null,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists admins_email_idx on public.admins (lower(email));

-- ---------------------------------------------------------------------------
-- invites
-- The invite-only gate for member OAuth. Admin adds name + email manually.
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  role         text not null default 'member' check (role in ('member', 'admin')),
  invited_by   uuid references public.profiles (id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- case-insensitive uniqueness on email
create unique index if not exists invites_email_lower_key
  on public.invites (lower(email));

-- ---------------------------------------------------------------------------
-- seasons
-- ---------------------------------------------------------------------------
create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  number      int not null unique,
  name        text not null,
  starts_on   date not null,
  ends_on     date not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- session_slots
-- The fixed calendar. Dates are not editable in the app for Season 1.
-- ---------------------------------------------------------------------------
create table if not exists public.session_slots (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.seasons (id) on delete cascade,
  slot_date   date not null,
  slot_type   text not null check (slot_type in ('kickoff', 'talk', 'recognition')),
  label       text not null,
  sort_order  int not null,
  created_at  timestamptz not null default now(),
  unique (season_id, slot_date)
);

create index if not exists session_slots_season_sort_idx
  on public.session_slots (season_id, sort_order);

-- ---------------------------------------------------------------------------
-- talks
-- ---------------------------------------------------------------------------
create table if not exists public.talks (
  id                uuid primary key default gen_random_uuid(),
  slot_id           uuid not null references public.session_slots (id) on delete cascade,
  presenter_id      uuid not null references public.profiles (id) on delete cascade,
  title             text not null,
  description       text not null,
  deck_path         text,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid references public.profiles (id) on delete set null,
  rejection_reason  text
);

-- One live claim per slot. A rejected row does NOT block a fresh submission,
-- so "reject" frees the slot back up and "pending/approved" locks it.
create unique index if not exists talks_active_slot_key
  on public.talks (slot_id)
  where status <> 'rejected';

-- One active (pending or approved) talk per presenter at a time.
create unique index if not exists talks_active_presenter_key
  on public.talks (presenter_id)
  where status <> 'rejected';

-- ---------------------------------------------------------------------------
-- ratings
-- 5 parameters, 1-10 each, plus a free-text comment. One rating per rater
-- per talk.
-- ---------------------------------------------------------------------------
create table if not exists public.ratings (
  id              uuid primary key default gen_random_uuid(),
  talk_id         uuid not null references public.talks (id) on delete cascade,
  rater_id        uuid not null references public.profiles (id) on delete cascade,
  understanding   int not null check (understanding between 1 and 10),
  content         int not null check (content between 1 and 10),
  research_depth  int not null check (research_depth between 1 and 10),
  delivery        int not null check (delivery between 1 and 10),
  usefulness      int not null check (usefulness between 1 and 10),
  comment         text,
  created_at      timestamptz not null default now(),
  unique (talk_id, rater_id)
);

create index if not exists ratings_talk_idx on public.ratings (talk_id);
create index if not exists ratings_rater_idx on public.ratings (rater_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles      enable row level security;
alter table public.invites       enable row level security;
alter table public.seasons       enable row level security;
alter table public.session_slots enable row level security;
alter table public.talks         enable row level security;
alter table public.ratings       enable row level security;

-- profiles: everyone logged in can see the roster; you may only edit yourself.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- invites: intentionally NO policies for `authenticated`.
-- Default-deny. Only the service-role client (which bypasses RLS) touches it.

-- seasons / session_slots: read-only reference data for members.
drop policy if exists seasons_select_authenticated on public.seasons;
create policy seasons_select_authenticated
  on public.seasons for select
  to authenticated
  using (true);

drop policy if exists session_slots_select_authenticated on public.session_slots;
create policy session_slots_select_authenticated
  on public.session_slots for select
  to authenticated
  using (true);

-- talks: approved talks are public to the cohort. A pending claim is visible
-- only to its presenter and to admins — that is what keeps the calendar
-- anonymous ("pending review") until approval.
drop policy if exists talks_select_visible on public.talks;
create policy talks_select_visible
  on public.talks for select
  to authenticated
  using (
    status = 'approved'
    or presenter_id = auth.uid()
    or public.is_admin()
  );

-- no insert/update/delete policies for `authenticated`:
-- /api/talks and /api/admin/talks/[id] do those with the service-role client.

-- ratings: the base table stays locked to the rater (and admins) so that peer
-- feedback can be surfaced anonymously via the aggregation route without
-- identity ever leaking through a direct query.
drop policy if exists ratings_select_own_or_admin on public.ratings;
create policy ratings_select_own_or_admin
  on public.ratings for select
  to authenticated
  using (
    rater_id = auth.uid()
    or public.is_admin()
  );

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
        and t.presenter_id <> auth.uid()
    )
  );

-- no update/delete policies: ratings are immutable once submitted.

-- ============================================================================
-- Seed: Season 1 + its 8 fixed October 2026 dates
-- ============================================================================

insert into public.seasons (number, name, starts_on, ends_on, is_active)
values (1, 'Season 1', date '2026-10-04', date '2026-10-31', true)
on conflict (number) do nothing;

insert into public.session_slots (season_id, slot_date, slot_type, label, sort_order)
select s.id, v.slot_date, v.slot_type, v.label, v.sort_order
from public.seasons s
cross join (values
  (date '2026-10-04', 'kickoff',     'kickoff',      1),
  (date '2026-10-10', 'talk',        'talk 1a',      2),
  (date '2026-10-11', 'talk',        'talk 1b',      3),
  (date '2026-10-17', 'talk',        'talk 2a',      4),
  (date '2026-10-18', 'talk',        'talk 2b',      5),
  (date '2026-10-24', 'talk',        'talk 3a',      6),
  (date '2026-10-25', 'talk',        'talk 3b',      7),
  (date '2026-10-31', 'recognition', 'recognitions', 8)
) as v (slot_date, slot_type, label, sort_order)
where s.number = 1
on conflict (season_id, slot_date) do nothing;

-- ============================================================================
-- Seed: admin account
--
-- ****************************************************************************
-- **  EDIT THE EMAIL AND INITIAL PASSWORD BELOW BEFORE RUNNING THIS FILE.  **
-- **  The admin can log in at /admin/login and will have full privileges.   **
-- **  Leaving the placeholder means nobody can administer Season 1.         **
-- **  NOTE: After first login, the admin should change their password.      **
-- ****************************************************************************
-- ============================================================================

-- Admin account
INSERT INTO admins (email, name)
VALUES ('rohankokkula01@gmail.com', 'Admin')
ON CONFLICT (email) DO NOTHING;
