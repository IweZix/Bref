-- Closes the TOCTOU gap the old app-level "SELECT count() then INSERT"
-- check had: a plain `select count(*) ... for update` can't lock rows that
-- don't exist yet, so two concurrent inserts at the exact quota boundary
-- would both read "4 of 5" and both proceed. A transaction-scoped advisory
-- lock keyed on user_id serializes only that one user's own concurrent
-- custom-slug inserts (never blocking other users), released automatically
-- at commit/rollback.
create or replace function public.enforce_custom_slug_quota()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_premium boolean;
  v_override integer;
  v_tier_default integer;
  v_quota integer;
  v_current_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select is_premium, custom_slug_quota into v_is_premium, v_override
    from public.profiles where id = new.user_id;

  select custom_slug_quota into v_tier_default
    from public.quota_tiers
    where tier = case when coalesce(v_is_premium, false) then 'premium' else 'standard' end;

  -- Resolution order: per-user override -> premium/standard tier default
  -- (public.quota_tiers, the same table the app reads) -> 5 as a last-resort
  -- fallback if quota_tiers is ever empty.
  v_quota := coalesce(v_override, v_tier_default, 5);

  -- is_active is NOT filtered: a disabled link still reserves its quota
  -- slot. expires_at is NOT filtered either -- nothing else in this
  -- codebase enforces expiry yet (a dead column); treating it as inactive
  -- here would be undocumented scope creep.
  select count(*) into v_current_count
    from public.links
    where user_id = new.user_id and is_custom_slug = true;

  if v_current_count >= v_quota then
    raise exception 'custom slug quota exceeded (% of % used)', v_current_count, v_quota
      using errcode = 'BR002';
  end if;

  return new;
end;
$$;

create trigger enforce_custom_slug_quota_trigger
  before insert on public.links
  for each row
  when (new.is_custom_slug)
  execute function public.enforce_custom_slug_quota();
