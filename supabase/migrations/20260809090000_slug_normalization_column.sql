-- Generated (not app-written): the DB is the final arbiter of uniqueness,
-- same philosophy as RLS. Recomputed automatically, can't drift from `slug`.
alter table public.links
  add column slug_normalized text
  generated always as (lower(normalize(slug, nfkc))) stored;

-- Additive -- the existing `links_slug_key` unique constraint on `slug` is
-- untouched, so every existing row keeps resolving during and after deploy.
create unique index links_slug_normalized_key on public.links (slug_normalized);
