-- Custom slugs are a privilege of a verified account, never an anonymous
-- session. `is_anonymous` in the JWT already IS the confirmed-email signal:
-- updateUser({ email }) on an anonymous session leaves is_anonymous true
-- until the email is actually verified -- only verification flips it to
-- false. So gating on `is_anonymous is false` is gating on "confirmed
-- email," with no extra read of auth.users.email_confirmed_at needed.
--
-- A RESTRICTIVE policy is the right tool here (not a trigger): it's a pure
-- per-row predicate with no aggregate, so it has no concurrency issue to
-- solve, and it composes by ANDing with the existing permissive
-- links_insert_own policy without needing to touch that policy at all.
--
-- (select auth.jwt()) -- not (select (auth.jwt() ->> ...)) -- wraps only the
-- function call itself, letting Postgres cache it once per statement rather
-- than re-evaluating per row; the extraction happens outside the select.
create policy "links_custom_slug_requires_verified_account"
on public.links as restrictive
for insert
to authenticated
with check (
  is_custom_slug = false
  or ((select auth.jwt()) ->> 'is_anonymous')::boolean is false
);
