-- Detail rows are only needed to feed clicks_daily; once aggregated, they're
-- purged past 90 days to respect the free tier's 500MB storage limit.
-- Not granted to any Data API role: only pg_cron (running as the migration
-- owner) invokes this.
create or replace function public.purge_old_clicks()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.clicks where clicked_at < now() - interval '90 days';
$$;
