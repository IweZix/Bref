create table public.clicks_daily (
  link_id uuid not null references public.links (id) on delete cascade,
  day date not null,
  country text not null default '',
  referrer_host text not null default '',
  device_type text not null default '',
  click_count integer not null default 0,
  unique_count integer not null default 0,
  bot_count integer not null default 0,
  primary key (link_id, day, country, referrer_host, device_type)
);

comment on table public.clicks_daily is 'Daily aggregate kept indefinitely after detailed clicks are purged past 90 days. Populated idempotently by the nightly aggregation job (ticket 11).';
