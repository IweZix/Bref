create table public.rate_limits (
  subject_type text not null check (subject_type in ('session', 'ip')),
  subject_key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (subject_type, subject_key, window_start)
);

comment on table public.rate_limits is
  'Fixed-window counters for link creation, keyed by session id and by hashed IP separately — both must pass.';

-- No RLS policies: this table is never exposed to anon/authenticated at all,
-- only the service role touches it (also why RLS is enabled as defense in depth
-- even though no policy grants access).
alter table public.rate_limits enable row level security;

grant select, insert, update on public.rate_limits to service_role;

-- Atomic increment-and-read: a client-side fetch-then-write would race under
-- concurrent requests from the same session/IP.
create or replace function public.increment_rate_limit(p_subject_type text, p_subject_key text, p_window_start timestamptz)
returns integer
language sql
security invoker
set search_path = ''
as $$
  insert into public.rate_limits (subject_type, subject_key, window_start, count)
  values (p_subject_type, p_subject_key, p_window_start, 1)
  on conflict (subject_type, subject_key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count;
$$;

grant execute on function public.increment_rate_limit(text, text, timestamptz) to service_role;
