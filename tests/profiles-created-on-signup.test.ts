import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

/**
 * handle_new_user() (supabase/migrations/20260814090200_...) must create a
 * public.profiles row for every new auth.users row, anonymous sessions
 * included -- without one, a session's first custom-slug attempt would 500
 * on a missing profile rather than cleanly deny/allow.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('profiles created on signup', () => {
  const url = SUPABASE_URL as string;
  const anonKey = ANON_KEY as string;
  const serviceRoleKey = SERVICE_ROLE_KEY as string;

  it('an anonymous sign-in gets a profile row with the standard defaults', async () => {
    const anon = createClient(url, anonKey);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');

    const service = createClient(url, serviceRoleKey);
    const { data: profile, error } = await service
      .from('profiles')
      .select('id, is_premium, custom_slug_quota')
      .eq('id', session.user.id)
      .single();

    expect(error).toBeNull();
    expect(profile).toMatchObject({
      id: session.user.id,
      is_premium: false,
      custom_slug_quota: null,
    });
  });

  it('re-inserting for an id that already has a profile is a clean no-op (on conflict do nothing)', async () => {
    const anon = createClient(url, anonKey);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');

    const service = createClient(url, serviceRoleKey);
    // Mirrors the exact statement handle_new_user() and the one-time
    // backfill both use (supabase/migrations/20260814090000_profiles_table.sql,
    // 20260814090200_handle_new_user_trigger.sql) -- re-running it for an id
    // that already has a row must not error, unlike a plain insert.
    const { error } = await service
      .from('profiles')
      .upsert(
        { id: session.user.id },
        { onConflict: 'id', ignoreDuplicates: true },
      )
      .select();

    expect(error).toBeNull();
  });
});
