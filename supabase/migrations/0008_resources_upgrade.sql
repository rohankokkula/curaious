-- Resources overhaul: categories, member-written articles (moderated like
-- talks), likes, saves. Extends resource_links in place rather than a new
-- table — every existing row becomes `kind = 'link'`, unchanged in behaviour.
-- Re-runnable, like every migration here. Paste into the Supabase SQL editor.

alter table public.resource_links add column if not exists kind text not null default 'link'
  check (kind in ('link', 'article'));
alter table public.resource_links add column if not exists category text not null default 'other'
  check (category in ('paper', 'article', 'tool', 'guide', 'video', 'demo', 'other'));
alter table public.resource_links add column if not exists tags text[] not null default '{}';
alter table public.resource_links add column if not exists slug text;
alter table public.resource_links add column if not exists body_markdown text;
alter table public.resource_links add column if not exists thumbnail_url text;
alter table public.resource_links add column if not exists favicon_url text;
alter table public.resource_links add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));
alter table public.resource_links add column if not exists reviewed_at timestamptz;
alter table public.resource_links add column if not exists reviewed_by uuid
  references public.profiles (id) on delete set null;
alter table public.resource_links add column if not exists rejection_reason text;
alter table public.resource_links add column if not exists read_minutes int;
alter table public.resource_links add column if not exists updated_at timestamptz;

-- unique only where set — most rows (plain links) never get a slug
create unique index if not exists resource_links_slug_key on public.resource_links (slug)
  where slug is not null;

create table if not exists public.resource_likes (
  resource_id uuid not null references public.resource_links (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (resource_id, user_id)
);

-- same shape as likes, kept as a separate table rather than a `kind` column
-- on one table so "did I save this" and "did I like this" stay two simple
-- independent lookups instead of one row needing two states.
create table if not exists public.resource_saves (
  resource_id uuid not null references public.resource_links (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (resource_id, user_id)
);

alter table public.resource_likes enable row level security;
alter table public.resource_saves enable row level security;

drop policy if exists resource_likes_select on public.resource_likes;
create policy resource_likes_select on public.resource_likes
  for select to authenticated using (true);
drop policy if exists resource_likes_insert_own on public.resource_likes;
create policy resource_likes_insert_own on public.resource_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists resource_likes_delete_own on public.resource_likes;
create policy resource_likes_delete_own on public.resource_likes
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists resource_saves_select on public.resource_saves;
create policy resource_saves_select on public.resource_saves
  for select to authenticated using (true);
drop policy if exists resource_saves_insert_own on public.resource_saves;
create policy resource_saves_insert_own on public.resource_saves
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists resource_saves_delete_own on public.resource_saves;
create policy resource_saves_delete_own on public.resource_saves
  for delete to authenticated using (user_id = auth.uid());

-- A pending article is visible only to its author and admins, same as a
-- pending talk — was `using (true)` when every row was an instantly-public link.
drop policy if exists resource_links_select on public.resource_links;
create policy resource_links_select on public.resource_links
  for select to authenticated
  using (status = 'approved' or added_by = auth.uid() or public.is_admin());

-- Links still publish instantly (no review asked for those); an article can
-- only ever be inserted as 'pending' — a member can't self-approve one by
-- posting status: 'approved' in the request body.
drop policy if exists resource_links_insert_own on public.resource_links;
create policy resource_links_insert_own on public.resource_links
  for insert to authenticated
  with check (added_by = auth.uid() and (kind = 'link' or status = 'pending'));

-- Links (kind = 'link') are editable by their owner or an admin at any time
-- — there was never a review gate on those. An article is only editable
-- while it's pending or rejected, and every edit has to land back on
-- 'pending' — it can't be nudged straight to 'approved' from here, and once
-- approved it's immutable through this policy (re-editing published work is
-- an admin action, not a quiet author rewrite).
drop policy if exists resource_links_update_own_pending on public.resource_links;
drop policy if exists resource_links_update_own on public.resource_links;
create policy resource_links_update_own on public.resource_links
  for update to authenticated
  using (
    (added_by = auth.uid() or public.is_admin())
    and (kind = 'link' or status in ('pending', 'rejected'))
  )
  with check (
    (added_by = auth.uid() or public.is_admin())
    and (kind = 'link' or status = 'pending')
  );
