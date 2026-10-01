-- Badges the curator awards to members, per season. The catalogue itself
-- (names, artwork, copy) lives in the app (src/lib/badges.ts); this table
-- only records who holds which badge.
--
-- Anyone signed in can see them (they're shown on profiles and the Badges
-- page); only an admin can award or take one back. Safe to paste twice.

create table if not exists public.member_badges (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.seasons (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  badge_key   text not null check (badge_key in ('showstopper', 'sharp_eye', 'deep_diver', 'librarian')),
  awarded_by  uuid references public.profiles (id) on delete set null,
  awarded_at  timestamptz not null default now(),
  unique (season_id, profile_id, badge_key)
);

create index if not exists member_badges_profile_idx on public.member_badges (profile_id);

alter table public.member_badges enable row level security;

drop policy if exists member_badges_select on public.member_badges;
create policy member_badges_select on public.member_badges
  for select to authenticated using (true);

drop policy if exists member_badges_admin_insert on public.member_badges;
create policy member_badges_admin_insert on public.member_badges
  for insert to authenticated with check (public.is_admin());

drop policy if exists member_badges_admin_delete on public.member_badges;
create policy member_badges_admin_delete on public.member_badges
  for delete to authenticated using (public.is_admin());
