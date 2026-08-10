-- Custom slugs whose link was deleted, kept forever (no quarantine/expiry
-- job) so nobody but the original retiring session can ever reuse them.
-- Deliberately NOT populated for random slugs -- a CSPRNG 7-char string has
-- no impersonation value, so retiring every deleted random link here would
-- just be unbounded write volume for no benefit.
create table public.retired_slugs (
  slug text not null,
  slug_normalized text generated always as (lower(normalize(slug, nfkc))) stored primary key,
  retired_by uuid not null references auth.users (id) on delete cascade,
  retired_at timestamptz not null default now()
);

comment on table public.retired_slugs is
  'Permanently-retired custom slugs. Only the session in retired_by may recreate one (reclaim) -- see src/lib/shortener/retired-slug.ts.';

-- No RLS policies, same reasoning as public.rate_limits: never exposed to
-- anon/authenticated directly (an authenticated insert policy scoped to
-- retired_by = auth.uid() would let anyone "retire" a slug they never owned,
-- griefing it away from everyone forever) -- only server code (service
-- role, after it has itself verified a real delete happened) ever writes
-- here.
alter table public.retired_slugs enable row level security;

grant select, insert, update on public.retired_slugs to service_role;
