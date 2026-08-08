-- Staggered a few minutes apart to avoid contention; times are UTC.
select cron.schedule(
  'nightly-aggregate-clicks',
  '0 2 * * *',
  $$select public.aggregate_clicks_daily((current_date - 1))$$
);

select cron.schedule(
  'nightly-purge-old-clicks',
  '15 2 * * *',
  $$select public.purge_old_clicks()$$
);

select cron.schedule(
  'nightly-purge-empty-sessions',
  '30 2 * * *',
  $$select public.purge_empty_anonymous_sessions()$$
);
