create table public.reports (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references public.links (id) on delete set null,
  slug text not null,
  reason text not null check (char_length(reason) between 1 and 500),
  reporter_session_id uuid not null,
  created_at timestamptz not null default now()
);

comment on table public.reports is
  'User-submitted abuse/phishing reports, manual-moderation-only -- no admin UI, read directly via SQL.';

alter table public.reports enable row level security;

-- Same pattern as retired_slugs/rate_limits: written only by
-- src/app/api/reports/route.ts after its own auth + rate-limit gate, via the
-- service-role client -- never exposed to authenticated directly, so nobody
-- can read (or spam-insert as) another session's reports via the Data API.
grant select, insert on public.reports to service_role;

create index reports_link_id_idx on public.reports (link_id);
create index reports_created_at_idx on public.reports (created_at desc);
