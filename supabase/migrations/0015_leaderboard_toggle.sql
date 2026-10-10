-- Curator switch for the season leaderboard (/dashboard/leaderboard).
-- On by default; the leaderboard itself still stays sealed until the
-- season's last talk is done (see src/lib/scoreReveal.ts). Safe to paste twice.
alter table public.seasons add column if not exists leaderboard_enabled boolean not null default true;
