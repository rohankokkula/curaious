-- Drag-and-drop on the admin schedule: move a talk to another slot, or swap
-- two talks. Safe to paste twice.

-- move_talk, redone. The 0004 version counted with `count(*) ... for update`,
-- which Postgres rejects ("FOR UPDATE is not allowed with aggregate
-- functions"), so every move failed. Capacity is now enforced by the
-- talks_capacity_guard trigger from 0011; this only has to do the update.
create or replace function public.move_talk(p_talk uuid, p_slot uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from session_slots where id = p_slot;
  if not found then raise exception 'slot not found'; end if;
  update talks set slot_id = p_slot where id = p_talk;
  if not found then raise exception 'talk not found'; end if;
end $$;
revoke all on function public.move_talk(uuid, uuid) from public;
grant execute on function public.move_talk(uuid, uuid) to service_role;

-- Swap two talks' slots, atomically. A plain pair of updates can't do it when
-- both slots are full (each move would overfill the other slot for a moment),
-- so `a` steps out first: briefly marked rejected (which the capacity guard
-- ignores), `b` takes its seat, then `a` comes back into `b`'s old slot with
-- its real status. All inside one transaction, so nobody ever sees the
-- in-between state.
create or replace function public.swap_talks(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a talks;
  b talks;
begin
  select * into a from talks where id = p_a for update;
  select * into b from talks where id = p_b for update;
  if a.id is null or b.id is null then raise exception 'talk not found'; end if;
  if a.slot_id = b.slot_id then return; end if;

  update talks set status = 'rejected' where id = a.id;
  update talks set slot_id = a.slot_id where id = b.id;
  update talks set slot_id = b.slot_id, status = a.status where id = a.id;
end $$;
revoke all on function public.swap_talks(uuid, uuid) from public;
grant execute on function public.swap_talks(uuid, uuid) to service_role;
