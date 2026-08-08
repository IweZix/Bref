alter table public.links enable row level security;

-- New tables are not auto-exposed to the Data API by default; grant explicitly.
-- Row-level access is still fully controlled by the policies below.
grant select, insert, update, delete on public.links to authenticated;

-- service_role bypasses RLS policies, but table-level GRANTs are still required for it
-- to be reachable via the Data API at all (this is separate from bypassing RLS itself).
-- Only SELECT: the redirect route (ticket 6) resolves slug -> target_url with this role.
grant select on public.links to service_role;

create policy "links_select_own"
on public.links for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "links_insert_own"
on public.links for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "links_update_own"
on public.links for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "links_delete_own"
on public.links for delete
to authenticated
using ((select auth.uid()) = user_id);
