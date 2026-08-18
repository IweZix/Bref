create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  custom_slug_quota integer,
  created_at timestamptz not null default now(),
  constraint profiles_custom_slug_quota_non_negative
    check (custom_slug_quota is null or custom_slug_quota >= 0)
);

comment on table public.profiles is
  'One row per auth.users row (anonymous or verified), created by handle_new_user(). custom_slug_quota is a per-user override -- null means "use the tier default from quota_tiers". is_premium and custom_slug_quota are billing/admin-controlled only -- see rls_profiles.sql, this is the highest-priority security invariant in the feature.';

-- One-time backfill: the trigger added in handle_new_user_trigger.sql only
-- fires for auth.users rows created after that migration runs. Existing
-- sessions (anonymous and otherwise) need a row too, or their first
-- custom-slug attempt would 500 on a missing profile rather than cleanly
-- deny/allow.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
