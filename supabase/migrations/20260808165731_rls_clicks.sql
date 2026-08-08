alter table public.clicks enable row level security;

-- Read-only from the Data API for regular sessions: the service role is the only writer.
grant select on public.clicks to authenticated;

-- service_role bypasses RLS policies, but still needs an explicit table GRANT to be
-- reachable via the Data API at all. record-click (ticket 6/7) inserts through this role.
grant select, insert on public.clicks to service_role;

create policy "clicks_select_via_owned_link"
on public.clicks for select
to authenticated
using (
  exists (
    select 1
    from public.links
    where links.id = clicks.link_id
      and links.user_id = (select auth.uid())
  )
);

-- No insert/update/delete policy: writes go through the server with the service-role key,
-- which bypasses RLS entirely. This is intentional, not an oversight.
