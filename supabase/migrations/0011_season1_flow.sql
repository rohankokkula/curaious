-- Season 1, after kickoff:
--   1. session recordings live on the slot (the kickoff isn't a talk);
--   2. a talk is booked first and its deck reviewed separately, so a member
--      can claim a slot before their PDF exists;
--   3. the database itself refuses to overfill a slot.
-- Safe to paste twice.

-- 1. recordings on session slots, and the kickoff's own -----------------------
alter table public.session_slots add column if not exists recording_url text;

update public.session_slots
set recording_url = 'https://youtu.be/MfS1SujRT-M'
where slot_type = 'kickoff'
  and recording_url is null
  and season_id = (select id from public.seasons where is_active order by number desc limit 1);

-- 2. booking vs deck review ----------------------------------------------------
-- talks.status is now the *booking*: pending = requested, approved = booked,
-- rejected = declined. The deck has its own review state.
alter table public.talks add column if not exists deck_status text not null default 'none';
alter table public.talks drop constraint if exists talks_deck_status_check;
alter table public.talks add constraint talks_deck_status_check
  check (deck_status in ('none', 'submitted', 'approved', 'changes_requested'));
alter table public.talks add column if not exists deck_feedback text;
alter table public.talks add column if not exists deck_reviewed_at timestamptz;

-- Backfill once: decks on already-approved talks were reviewed under the old
-- flow (approve = deck approved); any other deck is waiting for review.
update public.talks set deck_status = 'approved'
where deck_status = 'none' and deck_path is not null and status = 'approved';
update public.talks set deck_status = 'submitted'
where deck_status = 'none' and deck_path is not null and status <> 'approved';

-- 3. no overlaps ---------------------------------------------------------------
-- One active talk per member is already a unique index (talks_active_presenter_key).
-- This closes the other race: two people taking the last seat at once.
create or replace function public.talks_capacity_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cap int;
  taken int;
begin
  if new.status = 'rejected' then return new; end if;
  if tg_op = 'UPDATE' and new.slot_id = old.slot_id and old.status <> 'rejected' then return new; end if;

  select capacity into cap from session_slots where id = new.slot_id for update;
  if cap is null then raise exception 'slot not found'; end if;

  select count(*) into taken from talks
  where slot_id = new.slot_id and status <> 'rejected' and id <> new.id;
  if taken >= cap then raise exception 'slot full'; end if;

  return new;
end $$;

drop trigger if exists talks_capacity_guard on public.talks;
create trigger talks_capacity_guard
  before insert or update of slot_id, status on public.talks
  for each row execute function public.talks_capacity_guard();
