-- Reorder two talks inside the same session (e.g. put the second speaker
-- first). Talks within a slot are ordered by submitted_at everywhere in the
-- app, so swapping two talks in one slot trades those timestamps. Talks in
-- different slots still trade slots, as in 0012. Safe to paste twice.
create or replace function public.swap_talks(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a talks;
  b talks;
begin
  select * into a from talks where id = p_a for update;
  select * into b from talks where id = p_b for update;
  if a.id is null or b.id is null then raise exception 'talk not found'; end if;
  if a.id = b.id then return; end if;

  if a.slot_id = b.slot_id then
    -- same session: swap their order
    update talks set submitted_at = b.submitted_at where id = a.id;
    update talks set submitted_at = a.submitted_at where id = b.id;
    return;
  end if;

  -- different sessions: trade slots. `a` steps out first (briefly rejected,
  -- which the capacity guard ignores) so neither slot is ever overfilled.
  update talks set status = 'rejected' where id = a.id;
  update talks set slot_id = a.slot_id, submitted_at = a.submitted_at where id = b.id;
  update talks set slot_id = b.slot_id, status = a.status, submitted_at = b.submitted_at where id = a.id;
end $$;
revoke all on function public.swap_talks(uuid, uuid) from public;
grant execute on function public.swap_talks(uuid, uuid) to service_role;
