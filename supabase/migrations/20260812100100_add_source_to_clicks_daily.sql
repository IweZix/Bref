-- Same source dimension as clicks.source, threaded into the daily rollup so
-- the QR/web split survives past the 90-day raw-click retention window.
-- Existing historical rows (aggregated before this feature existed) default
-- to 'web', which is correct: the QR pipeline didn't exist yet, so every
-- click behind those rows was web-sourced by construction.
alter table public.clicks_daily
  add column source text not null default 'web'
  constraint clicks_daily_source_check check (source in ('web', 'qr'));

-- clicks_daily's PK was declared inline at CREATE TABLE with no explicit
-- name, so Postgres auto-named it `<table>_pkey` -- clicks_daily_pkey.
alter table public.clicks_daily drop constraint clicks_daily_pkey;
alter table public.clicks_daily add constraint clicks_daily_pkey
  primary key (link_id, day, country, referrer_host, device_type, source);
