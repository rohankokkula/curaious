-- Hearticle analytics + likes. Safe to paste twice.
--
-- One row per visit (page load) in hearticle_views, updated while the person
-- reads: how far down the text they got and how many seconds they were
-- actually reading (tab visible, recently active). `is_read` is set by the
-- API once they reach the end and spent a real share of the read time there.
--
-- A visitor is an anonymous id in a first-party cookie; profile_id is filled
-- when a signed-in member reads, so the author's own visits can be left out.
-- Likes: one per visitor (or per member, across their devices).
--
-- Both tables have RLS on and no policies: only the server (service role,
-- in the /api/hearticles routes) reads or writes them. Nobody can scrape
-- another writer's numbers or forge a view with the anon key.

create table if not exists public.hearticle_views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.resource_links(id) on delete cascade,
  visitor_id uuid not null,
  profile_id uuid references public.profiles(id) on delete set null,
  source text not null default 'Direct',
  referrer_host text,
  device text not null default 'desktop' check (device in ('mobile', 'tablet', 'desktop')),
  country text,
  city text,
  local_hour smallint check (local_hour between 0 and 23),
  max_scroll smallint not null default 0 check (max_scroll between 0 and 100),
  active_seconds integer not null default 0 check (active_seconds between 0 and 21600),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hearticle_views_article_idx on public.hearticle_views (article_id, created_at desc);
create index if not exists hearticle_views_visitor_idx on public.hearticle_views (article_id, visitor_id);

alter table public.hearticle_views enable row level security;

create table if not exists public.hearticle_likes (
  article_id uuid not null references public.resource_links(id) on delete cascade,
  -- the member's profile id when signed in, else the visitor cookie id
  liker_key uuid not null,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (article_id, liker_key)
);

create index if not exists hearticle_likes_article_idx on public.hearticle_likes (article_id, created_at desc);

alter table public.hearticle_likes enable row level security;
