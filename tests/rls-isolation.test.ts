import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

function requireEnv(value: string | undefined, name: string): string {
  if (!value)
    throw new Error(
      `${name} is not set — run \`npx supabase start\` and populate .env.test.local`,
    );
  return value;
}

/**
 * Spec test 5: an anonymous session must never be able to read another anonymous
 * session's links or clicks — isolation is enforced by RLS in the database, not by
 * app code, so this test hits both the supabase-js client and the raw PostgREST
 * endpoint directly with session B's token.
 *
 * Requires the local Supabase stack: `npx supabase start`, then
 * `npx supabase status -o env` to populate .env.test.local (see that file's comment).
 */
describe.skipIf(!hasLocalStack)(
  'RLS isolation between anonymous sessions',
  () => {
    const url = requireEnv(SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requireEnv(
      ANON_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
    const serviceRoleKey = requireEnv(
      SERVICE_ROLE_KEY,
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    let linkIdA: string;
    let slugA: string;
    let accessTokenA: string;
    let accessTokenB: string;

    beforeAll(async () => {
      const clientA = createClient(url, anonKey);
      const { data: sessionA } = await clientA.auth.signInAnonymously();
      if (!sessionA.user || !sessionA.session)
        throw new Error('Failed to create anonymous session A');
      accessTokenA = sessionA.session.access_token;

      slugA = `rls-test-${crypto.randomUUID().slice(0, 8)}`;
      const { data: link, error: insertError } = await clientA
        .from('links')
        .insert({
          slug: slugA,
          target_url: 'https://example.com/owned-by-a',
          user_id: sessionA.user.id,
        })
        .select()
        .single();
      if (insertError || !link)
        throw new Error(`Setup insert failed: ${insertError?.message}`);
      linkIdA = link.id;

      const service = createClient(url, serviceRoleKey);
      const { error: clickError } = await service.from('clicks').insert({
        link_id: linkIdA,
        device_type: 'desktop',
      });
      if (clickError)
        throw new Error(`Setup click insert failed: ${clickError.message}`);

      const clientB = createClient(url, anonKey);
      const { data: sessionB } = await clientB.auth.signInAnonymously();
      if (!sessionB.session)
        throw new Error('Failed to create anonymous session B');
      accessTokenB = sessionB.session.access_token;
    });

    it("session B cannot read session A's links via the supabase-js client", async () => {
      const clientB = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${accessTokenB}` } },
      });
      const { data, error } = await clientB
        .from('links')
        .select()
        .eq('id', linkIdA);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("session B cannot read session A's clicks via the supabase-js client", async () => {
      const clientB = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${accessTokenB}` } },
      });
      const { data, error } = await clientB
        .from('clicks')
        .select()
        .eq('link_id', linkIdA);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a raw PostgREST request with session B's token cannot read session A's link", async () => {
      const response = await fetch(`${url}/rest/v1/links?id=eq.${linkIdA}`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessTokenB}`,
        },
      });
      expect(response.ok).toBe(true);
      const rows = await response.json();
      expect(rows).toEqual([]);
    });

    it('session A (the real owner) can still read its own link — positive control', async () => {
      const response = await fetch(`${url}/rest/v1/links?id=eq.${linkIdA}`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessTokenA}`,
        },
      });
      expect(response.ok).toBe(true);
      const rows = await response.json();
      expect(rows).toHaveLength(1);
      expect(rows[0].slug).toBe(slugA);
    });
  },
);
