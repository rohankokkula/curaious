-- 0001_init.sql used `create table if not exists`, so adding the `role`
-- column there never reached databases where `invites` already existed.
-- This patches those in place.
alter table public.invites
  add column if not exists role text not null default 'member';

alter table public.invites
  drop constraint if exists invites_role_check;

alter table public.invites
  add constraint invites_role_check check (role in ('member', 'admin'));
