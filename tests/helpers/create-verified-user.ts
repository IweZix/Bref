import { createClient } from '@supabase/supabase-js';

/**
 * Creates a real, verified (non-anonymous) auth.users row via the Admin API
 * and returns a signed-in client for it -- the RLS-scoped equivalent of a
 * converted account, for tests that need `is_anonymous = false` without
 * driving the actual email-confirmation UI flow end to end.
 */
export async function createVerifiedUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  const service = createClient(url, serviceRoleKey);
  const email = `test-${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    throw new Error(
      `Failed to create verified test user: ${createError?.message}`,
    );
  }

  const client = createClient(url, anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    throw new Error(
      `Failed to sign in as verified test user: ${signInError.message}`,
    );
  }

  return { userId: created.user.id, client };
}
