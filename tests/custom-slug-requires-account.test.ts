import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY);

/**
 * Addendum spec test §7.1: an anonymous session must never be able to
 * create a custom slug, including by calling the API (here: the database
 * itself) directly with a valid anonymous token -- enforced by the
 * links_custom_slug_requires_verified_account RESTRICTIVE policy
 * (supabase/migrations/20260814090500_...), not just application code in
 * POST /api/links.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)(
  'custom slugs require a verified account',
  () => {
    const url = SUPABASE_URL as string;
    const anonKey = ANON_KEY as string;

    it('an anonymous session cannot insert a custom-slug link', async () => {
      const anon = createClient(url, anonKey);
      const { data: session } = await anon.auth.signInAnonymously();
      if (!session.user) throw new Error('Failed to create anonymous session');

      const { error } = await anon.from('links').insert({
        slug: `anon-custom-${crypto.randomUUID().slice(0, 8)}`,
        target_url: 'https://example.com/anon-custom',
        user_id: session.user.id,
        is_custom_slug: true,
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('the same anonymous session can still create a random-slug link', async () => {
      const anon = createClient(url, anonKey);
      const { data: session } = await anon.auth.signInAnonymously();
      if (!session.user) throw new Error('Failed to create anonymous session');

      const { error } = await anon.from('links').insert({
        slug: `anon-random-${crypto.randomUUID().slice(0, 8)}`,
        target_url: 'https://example.com/anon-random',
        user_id: session.user.id,
        is_custom_slug: false,
      });

      expect(error).toBeNull();
    });
  },
);
