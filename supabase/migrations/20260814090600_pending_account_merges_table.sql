-- Short-lived, single-use proof that a browser really was authenticated as
-- source_user_id at the moment the cross-device merge flow started.
-- /api/account/merge must never trust a client-supplied source user id
-- directly -- any authenticated user could otherwise reassign a stranger's
-- links by guessing/leaking a UUID. This table is the proof instead: minted
-- while still authenticated as the source session, consumed (deleted) the
-- instant the merge is confirmed, never reused.
create table public.pending_account_merges (
  token uuid primary key default gen_random_uuid(),
  source_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.pending_account_merges is
  'Proof-of-prior-session tokens for the cross-device account merge flow (src/app/api/account/prepare-merge, src/app/api/account/merge). Consumed (deleted) on use; treat any row older than auth.email.otp_expiry as expired.';

-- No RLS policies -- same reasoning as public.retired_slugs and
-- public.rate_limits: never exposed to anon/authenticated directly, only
-- server code (service role, after it has independently verified both the
-- target's cookie session and the token itself) ever touches this table.
alter table public.pending_account_merges enable row level security;

grant select, insert, delete on public.pending_account_merges to service_role;
