-- Ratings go from 1-5 stars to a 1-10 scale (same five columns).
--
-- Existing scores are doubled so they keep their meaning (a 4/5 becomes
-- 8/10). That only happens while the constraints still say 1-5, so pasting
-- this file a second time won't double them again.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'ratings_understanding_check'
      and pg_get_constraintdef(oid) like '%<= 5%'
  ) then
    alter table public.ratings drop constraint if exists ratings_understanding_check;
    alter table public.ratings drop constraint if exists ratings_content_check;
    alter table public.ratings drop constraint if exists ratings_research_depth_check;
    alter table public.ratings drop constraint if exists ratings_delivery_check;
    alter table public.ratings drop constraint if exists ratings_usefulness_check;

    update public.ratings set
      understanding  = understanding  * 2,
      content        = content        * 2,
      research_depth = research_depth * 2,
      delivery       = delivery       * 2,
      usefulness     = usefulness     * 2;
  end if;
end $$;

alter table public.ratings drop constraint if exists ratings_understanding_check;
alter table public.ratings drop constraint if exists ratings_content_check;
alter table public.ratings drop constraint if exists ratings_research_depth_check;
alter table public.ratings drop constraint if exists ratings_delivery_check;
alter table public.ratings drop constraint if exists ratings_usefulness_check;

alter table public.ratings add constraint ratings_understanding_check  check (understanding  between 1 and 10);
alter table public.ratings add constraint ratings_content_check        check (content        between 1 and 10);
alter table public.ratings add constraint ratings_research_depth_check check (research_depth between 1 and 10);
alter table public.ratings add constraint ratings_delivery_check       check (delivery       between 1 and 10);
alter table public.ratings add constraint ratings_usefulness_check     check (usefulness     between 1 and 10);
