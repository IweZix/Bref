-- Getting an anonymous identity costs one request with no verification, so they
-- accumulate; purge ones that never created a link and have been around 30+ days.
-- Not granted to any Data API role: only pg_cron invokes this.
create or replace function public.purge_empty_anonymous_sessions()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from auth.users
  where is_anonymous is true
    and created_at < now() - interval '30 days'
    and not exists (
      select 1 from public.links where links.user_id = auth.users.id
    );
$$;
