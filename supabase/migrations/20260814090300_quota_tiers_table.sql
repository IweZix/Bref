-- Single source of truth for the two tier-level custom-slug quota defaults.
-- Postgres can't import a TS constant and a TS constant can't be read from
-- SQL -- rather than keep two hardcoded literals in sync by comment alone
-- (drift-prone), both enforce_custom_slug_quota() and the app read this
-- same table (src/lib/shortener/custom-slug-quota.ts). Never hardcode a
-- quota number anywhere else.
create table public.quota_tiers (
  tier text primary key check (tier in ('standard', 'premium')),
  custom_slug_quota integer not null check (custom_slug_quota >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.quota_tiers is
  'Tier-level custom-slug quota defaults, read by enforce_custom_slug_quota() and by the app. profiles.custom_slug_quota (a per-user override) takes precedence over this when set.';

insert into public.quota_tiers (tier, custom_slug_quota) values
  ('standard', 5),
  ('premium', 20); -- placeholder -- exact premium number is a product decision, not yet finalized

alter table public.quota_tiers enable row level security;

grant select on public.quota_tiers to authenticated;
grant select, update on public.quota_tiers to service_role;

create policy "quota_tiers_select_all"
on public.quota_tiers for select
to authenticated
using (true);
-- World-readable (to `authenticated`, which anonymous sessions also are) so
-- UI copy like "5 max" and the quota meter can render even before someone
-- converts. No insert/update/delete policy for `authenticated` -- same
-- never-user-writable protection as profiles.is_premium.
