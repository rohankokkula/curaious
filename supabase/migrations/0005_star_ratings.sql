-- Switch ratings from 1-10 sliders to 1-5 stars (5 re-labelled categories:
-- Content Quality, Technical Depth, Delivery & Clarity, Practical Takeaways,
-- Overall Experience — same columns, new scale and copy in the app layer),
-- and add speaker social links used on the unified talk page.

update public.ratings set
  understanding  = greatest(1, least(5, ceil(understanding  / 2.0))),
  content        = greatest(1, least(5, ceil(content        / 2.0))),
  research_depth = greatest(1, least(5, ceil(research_depth / 2.0))),
  delivery       = greatest(1, least(5, ceil(delivery       / 2.0))),
  usefulness     = greatest(1, least(5, ceil(usefulness     / 2.0)));

alter table public.ratings drop constraint if exists ratings_understanding_check;
alter table public.ratings drop constraint if exists ratings_content_check;
alter table public.ratings drop constraint if exists ratings_research_depth_check;
alter table public.ratings drop constraint if exists ratings_delivery_check;
alter table public.ratings drop constraint if exists ratings_usefulness_check;

alter table public.ratings add constraint ratings_understanding_check  check (understanding  between 1 and 5);
alter table public.ratings add constraint ratings_content_check        check (content        between 1 and 5);
alter table public.ratings add constraint ratings_research_depth_check check (research_depth between 1 and 5);
alter table public.ratings add constraint ratings_delivery_check       check (delivery       between 1 and 5);
alter table public.ratings add constraint ratings_usefulness_check     check (usefulness     between 1 and 5);

alter table public.profiles
  add column if not exists linkedin_url text,
  add column if not exists twitter_url text,
  add column if not exists github_url text;
