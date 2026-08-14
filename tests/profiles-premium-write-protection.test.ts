import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

/**
 * Spec §4.2 / addendum §7.4: is_premium (and custom_slug_quota) must never
 * be writable by the user it belongs to -- a profiles table an authenticated
 * caller can UPDATE is a premium account one PostgREST request away from the
 * browser console. This is the single most important test in the whole
 * feature: every write path (supabase-js .update()/.upsert(), and a raw
 * PostgREST PATCH, matching tests/rls-isolation.test.ts's style) must be
 * rejected for both an anonymous and a verified caller, on their own row.
 * Only service_role may succeed.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('profiles.is_premium write protection', () => {
  const url = SUPABASE_URL as string;
  const anonKey = ANON_KEY as string;
  const serviceRoleKey = SERVICE_ROLE_KEY as string;

  it('an anonymous session cannot set is_premium on its own row via supabase-js', async () => {
    const anon = createClient(url, anonKey);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');

    const { data, error } = await anon
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', session.user.id)
      .select();

    // RLS makes this a silent 0-row update, not a hard error -- assert both
    // possibilities are covered: either an error, or zero rows affected.
    expect(error === null ? data : []).toEqual([]);

    const service = createClient(url, serviceRoleKey);
    const { data: profile } = await service
      .from('profiles')
      .select('is_premium')
      .eq('id', session.user.id)
      .single();
    expect(profile?.is_premium).toBe(false);
  });

  it('a verified account cannot set is_premium or custom_slug_quota on its own row via supabase-js', async () => {
    const { userId, client } = await createVerifiedUser();

    const { data, error } = await client
      .from('profiles')
      .update({ is_premium: true, custom_slug_quota: 999 })
      .eq('id', userId)
      .select();

    expect(error === null ? data : []).toEqual([]);

    const service = createClient(url, serviceRoleKey);
    const { data: profile } = await service
      .from('profiles')
      .select('is_premium, custom_slug_quota')
      .eq('id', userId)
      .single();
    expect(profile).toMatchObject({
      is_premium: false,
      custom_slug_quota: null,
    });
  });

  it('a raw PostgREST PATCH from a verified account is rejected the same way', async () => {
    const { userId, client } = await createVerifiedUser();
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) throw new Error('Failed to obtain session for verified user');

    const response = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ is_premium: true }),
    });

    // No insert/update policy at all for `authenticated` means PostgREST
    // itself refuses the statement outright (RLS with zero applicable
    // policies denies, it doesn't silently no-op an UPDATE the way a
    // permissive-but-unmatched policy would).
    const body = await response.json().catch(() => null);
    expect(response.ok && Array.isArray(body) && body.length > 0).toBe(false);

    const service = createClient(url, serviceRoleKey);
    const { data: profile } = await service
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .single();
    expect(profile?.is_premium).toBe(false);
  });

  it('service_role can set is_premium — positive control', async () => {
    const { userId } = await createVerifiedUser();
    const service = createClient(url, serviceRoleKey);

    const { error } = await service
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId);
    expect(error).toBeNull();

    const { data: profile } = await service
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .single();
    expect(profile?.is_premium).toBe(true);
  });
});
