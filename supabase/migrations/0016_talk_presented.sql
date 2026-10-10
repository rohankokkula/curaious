-- The curator marks a talk as done once it's been given. Shown on the
-- schedule, the talk page and the leaderboard; when every booked talk in the
-- season is done, scores unveil (src/lib/scoreReveal.ts). Safe to paste twice.
alter table public.talks add column if not exists presented_at timestamptz;
