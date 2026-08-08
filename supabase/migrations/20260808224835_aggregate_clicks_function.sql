-- Idempotent by construction: full recompute of the target day on every run,
-- then INSERT ... ON CONFLICT DO UPDATE with the recomputed absolute counts
-- (never incremented) — re-running on an already-processed day cannot double counts.
create or replace function public.aggregate_clicks_daily(target_day date)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.clicks_daily (
    link_id, day, country, referrer_host, device_type, click_count, unique_count, bot_count
  )
  select
    link_id,
    target_day,
    coalesce(country, ''),
    coalesce(referrer_host, ''),
    device_type,
    count(*) filter (where not is_bot) as click_count,
    count(distinct visitor_hash) filter (where not is_bot) as unique_count,
    count(*) filter (where is_bot) as bot_count
  from public.clicks
  where clicked_at >= target_day::timestamptz
    and clicked_at < (target_day + 1)::timestamptz
  group by link_id, coalesce(country, ''), coalesce(referrer_host, ''), device_type
  on conflict (link_id, day, country, referrer_host, device_type)
  do update set
    click_count = excluded.click_count,
    unique_count = excluded.unique_count,
    bot_count = excluded.bot_count;
$$;

-- Callable via the service-role Data API (used by the idempotence test and
-- available for a manual re-aggregate trigger) — not exposed to authenticated/anon.
grant execute on function public.aggregate_clicks_daily(date) to service_role;
