-- Not explicitly called out in the original spec's §4.4, but this table lives in the same
-- exposed `public` schema and holds per-user aggregate data, so it gets the same treatment.
alter table public.clicks_daily enable row level security;

grant select on public.clicks_daily to authenticated;

create policy "clicks_daily_select_via_owned_link"
on public.clicks_daily for select
to authenticated
using (
  exists (
    select 1
    from public.links
    where links.id = clicks_daily.link_id
      and links.user_id = (select auth.uid())
  )
);

-- No insert/update/delete policy: only the nightly aggregation job (ticket 11) writes here,
-- running as a privileged role outside the Data API.
