create table public.clicks (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.links (id) on delete cascade,
  clicked_at timestamptz not null default now(),
  country text,
  referrer_host text,
  device_type text not null check (device_type in ('mobile', 'desktop', 'tablet')),
  is_bot boolean not null default false,
  visitor_hash text
);

comment on table public.clicks is 'One row per redirect visit. No personal data: referrer is host-only, no IP is stored, visitor_hash rotates daily.';

create index clicks_link_id_clicked_at_idx on public.clicks (link_id, clicked_at desc);
