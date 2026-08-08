-- aggregate_clicks_daily() is SECURITY INVOKER (deliberately, per the security
-- checklist — SECURITY DEFINER should not be reached for just to dodge a grant),
-- so it runs with the CALLING role's privileges. pg_cron runs it as a privileged
-- role in production, but the service role must also be able to call it directly
-- (manual re-aggregate, tests), which needs write access on the table itself.
-- SELECT is needed too: ticket 3 only granted it to `authenticated` (dashboard
-- reads), never to service_role — INSERT ... ON CONFLICT DO UPDATE needs it as
-- well as the plain INSERT/UPDATE it was already assumed to need.
grant select, insert, update on public.clicks_daily to service_role;
