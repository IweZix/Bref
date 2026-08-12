-- QR codes: distinguishes a scan-and-follow visit (source='qr', produced by
-- appending ?s=qr to the short URL before it's encoded -- see
-- src/lib/shortener/click-source.ts / qr-options.ts) from an ordinary
-- web-referred visit. Whitelisted to 'web'/'qr' only, never free text, so it
-- can safely become a clicks_daily grouping/PK dimension without cardinality
-- blowup.
alter table public.clicks
  add column source text not null default 'web'
  constraint clicks_source_check check (source in ('web', 'qr'));
