-- public.links only ever granted service_role SELECT (rls_links.sql --
-- resolve-slug.ts's read). The reassignment below needs to write user_id
-- across users, which is squarely the "act across all users" category
-- CLAUDE.md reserves for service-role code -- grant the extra verb here,
-- next to the function that's the only thing that will ever use it.
grant update on public.links to service_role;

-- Transactional reassignment for the cross-device merge flow. Moves all of
-- the source (losing) anonymous session's random-slug links unconditionally,
-- and as many of its custom-slug links as fit in the target's remaining
-- quota, oldest first, in one deterministic pass. Never silently truncated:
-- the caller gets an exact reassigned/skipped split to report to the user
-- (spec: "partiellement refusee avec un message clair, pas silencieusement
-- tronquee").
--
-- SECURITY INVOKER is correct here (unlike handle_new_user()): this is only
-- ever called via the service_role client from
-- src/app/api/account/merge/route.ts, after that route has independently
-- verified the target's identity (its own cookie session) and the source's
-- identity (a consumed, single-use pending_account_merges token) --
-- service_role already bypasses RLS at the role level, so no additional
-- elevation is needed or wanted.
create or replace function public.merge_anonymous_links(
  p_source_user_id uuid,
  p_target_user_id uuid
)
returns table (reassigned_random integer, reassigned_custom integer, skipped_custom integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_target_is_premium boolean;
  v_target_override integer;
  v_target_tier_default integer;
  v_target_quota integer;
  v_target_current_count integer;
  v_available_slots integer;
  v_reassigned_random integer;
  v_reassigned_custom integer;
  v_skipped_custom integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_target_user_id::text, 0));

  select is_premium, custom_slug_quota into v_target_is_premium, v_target_override
    from public.profiles where id = p_target_user_id;

  select custom_slug_quota into v_target_tier_default
    from public.quota_tiers
    where tier = case when coalesce(v_target_is_premium, false) then 'premium' else 'standard' end;

  v_target_quota := coalesce(v_target_override, v_target_tier_default, 5);

  select count(*) into v_target_current_count
    from public.links where user_id = p_target_user_id and is_custom_slug = true;

  v_available_slots := greatest(v_target_quota - v_target_current_count, 0);

  with moved as (
    update public.links set user_id = p_target_user_id
      where user_id = p_source_user_id and is_custom_slug = false
      returning 1
  )
  select count(*) into v_reassigned_random from moved;

  with movable as (
    select id from public.links
    where user_id = p_source_user_id and is_custom_slug = true
    order by created_at asc
    limit v_available_slots
  ), moved as (
    update public.links set user_id = p_target_user_id
      where id in (select id from movable)
      returning 1
  )
  select count(*) into v_reassigned_custom from moved;

  select count(*) into v_skipped_custom
    from public.links where user_id = p_source_user_id and is_custom_slug = true;

  return query select v_reassigned_random, v_reassigned_custom, v_skipped_custom;
end;
$$;

grant execute on function public.merge_anonymous_links(uuid, uuid) to service_role;
