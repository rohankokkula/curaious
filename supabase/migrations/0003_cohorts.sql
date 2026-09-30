-- Cohorts (seasons) become first-class: per-cohort membership, editable
-- schedule, richer profiles, avatar storage, editable ratings.

alter table public.seasons
  add column if not exists slug text,
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  add column if not exists capacity int not null default 10;

update public.seasons set slug = 'season-' || number where slug is null;
update public.seasons set status = 'active' where is_active and status = 'draft';
create unique index if not exists seasons_slug_key on public.seasons (slug);

-- several slots may share a date (editable schedule); time is optional.
alter table public.session_slots drop constraint if exists session_slots_season_id_slot_date_key;
alter table public.session_slots
  add column if not exists starts_at time,
  add column if not exists ends_at time;

create table if not exists public.cohort_members (
  cohort_id   uuid not null references public.seasons (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'member' check (role in ('member', 'admin')),
  status      text not null default 'active' check (status in ('active', 'removed')),
  joined_at   timestamptz not null default now(),
  primary key (cohort_id, profile_id)
);
alter table public.cohort_members enable row level security;
drop policy if exists cohort_members_select on public.cohort_members;
create policy cohort_members_select on public.cohort_members
  for select to authenticated using (true);

insert into public.cohort_members (cohort_id, profile_id, role)
select s.id, p.id, p.role from public.seasons s cross join public.profiles p
where s.number = 1
on conflict do nothing;

alter table public.invites
  add column if not exists cohort_id uuid references public.seasons (id) on delete set null;
update public.invites set cohort_id = (select id from public.seasons where number = 1)
  where cohort_id is null;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists headline text,
  add column if not exists location text,
  add column if not exists bio text,
  add column if not exists tags text[] not null default '{}';

-- ratings become editable by their author.
drop policy if exists ratings_update_own on public.ratings;
create policy ratings_update_own on public.ratings
  for update to authenticated
  using (rater_id = auth.uid()) with check (rater_id = auth.uid());
alter table public.ratings add column if not exists updated_at timestamptz;

-- public avatar bucket (uploads go through the service role).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Atomically move a talk to another slot, swapping with any occupant.
create or replace function public.move_talk(p_talk uuid, p_slot uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.talks; b public.talks;
begin
  select * into a from talks where id = p_talk for update;
  if a.id is null then raise exception 'talk not found'; end if;
  if a.slot_id = p_slot then return; end if;
  select * into b from talks where slot_id = p_slot and status <> 'rejected' for update;
  if b.id is null then
    update talks set slot_id = p_slot where id = a.id;
  else
    update talks set status = 'rejected' where id = a.id;
    update talks set slot_id = a.slot_id where id = b.id;
    update talks set slot_id = p_slot, status = a.status where id = a.id;
  end if;
end $$;
revoke all on function public.move_talk(uuid, uuid) from public;
grant execute on function public.move_talk(uuid, uuid) to service_role;
