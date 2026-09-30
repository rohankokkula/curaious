-- Knowledge-sharing links: any cohort member can bookmark an article/link for
-- the group; anyone in the cohort can read them; you can only remove your own
-- (an admin can remove any).

create table if not exists public.resource_links (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.seasons (id) on delete cascade,
  added_by    uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  url         text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists resource_links_cohort_idx on public.resource_links (cohort_id, created_at desc);

alter table public.resource_links enable row level security;

drop policy if exists resource_links_select on public.resource_links;
create policy resource_links_select on public.resource_links
  for select to authenticated using (true);

drop policy if exists resource_links_insert_own on public.resource_links;
create policy resource_links_insert_own on public.resource_links
  for insert to authenticated with check (added_by = auth.uid());

drop policy if exists resource_links_delete_own_or_admin on public.resource_links;
create policy resource_links_delete_own_or_admin on public.resource_links
  for delete to authenticated using (added_by = auth.uid() or public.is_admin());
