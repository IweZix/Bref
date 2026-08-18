-- SECURITY DEFINER is the one deliberate exception to this project's "never
-- SECURITY DEFINER" rule. Justified specifically here because:
--  1. This function runs as part of an INSERT into auth.users, executed by
--     GoTrue's own internal role -- not `authenticated`, not `service_role`,
--     and not a role with any grant on public.profiles. There is no
--     non-elevated way to write public.profiles in response to that insert.
--  2. It takes no caller-supplied input: NEW is fully controlled by the
--     trigger firing mechanism, not by a request parameter, so there is no
--     "act as any user" surface the way a callable RPC would have.
--  3. It is a trigger, not a callable public function -- the usual
--     SECURITY DEFINER trap (an implicit EXECUTE grant to PUBLIC on
--     anything in the `public` schema) doesn't apply, since nothing calls
--     it directly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
