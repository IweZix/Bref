alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
grant select, insert, update on public.profiles to service_role;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

-- Deliberately NO insert/update/delete policy for `authenticated` at all.
-- is_premium and custom_slug_quota must only ever change via service_role
-- (a future billing webhook / manual admin action, same "no admin UI yet"
-- precedent as public.reports) or direct DB access -- never via any Data
-- API call from the browser, no matter how it's shaped. This is the single
-- most important test in the whole feature (see
-- tests/profiles-premium-write-protection.test.ts).
