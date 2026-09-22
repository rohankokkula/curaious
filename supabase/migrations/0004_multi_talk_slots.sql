-- A session slot can now hold more than one talk (e.g. 2-3 lightning talks
-- sharing a session), capped by a per-slot capacity the admin sets.

alter table public.session_slots
  add column if not exists capacity int not null default 2;

-- was: one non-rejected talk per slot. Replaced by a capacity check in the
-- application layer (POST /api/talks, move_talk below) since a partial
-- unique index can't express "at most N".
drop index if exists public.talks_active_slot_key;
create index if not exists talks_slot_idx on public.talks (slot_id) where status <> 'rejected';

-- Move a talk into a slot if it has room; raises if the slot is full.
create or replace function public.move_talk(p_talk uuid, p_slot uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.talks;
  taken int;
  cap int;
begin
  select * into a from talks where id = p_talk for update;
  if a.id is null then raise exception 'talk not found'; end if;
  if a.slot_id = p_slot then return; end if;

  select capacity into cap from session_slots where id = p_slot;
  if cap is null then raise exception 'slot not found'; end if;

  select count(*) into taken from talks
    where slot_id = p_slot and status <> 'rejected' and id <> a.id
    for update;
  if taken >= cap then raise exception 'slot full'; end if;

  update talks set slot_id = p_slot where id = a.id;
end $$;
revoke all on function public.move_talk(uuid, uuid) from public;
grant execute on function public.move_talk(uuid, uuid) to service_role;
