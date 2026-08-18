import { describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY);

/**
 * Addendum spec test §7.6: two simultaneous creations at the fifth (last
 * available) custom slug slot must result in exactly one success -- the
 * literal TOCTOU race the old app-level "SELECT count() then INSERT" check
 * in POST /api/links could lose (two concurrent reads both see "4 of 5" and
 * both proceed). enforce_custom_slug_quota()'s advisory-lock trigger
 * (supabase/migrations/20260814090400_...) is what actually closes it --
 * verified here with two genuinely concurrent inserts of *different* slugs,
 * distinct from tests/concurrent-custom-slug-creation.test.ts (same slug,
 * a uniqueness race, not a quota race).
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('concurrent custom slug quota boundary', () => {
  it('exactly one of two concurrent inserts at the quota boundary succeeds', async () => {
    const { userId, client } = await createVerifiedUser();

    // Fill 4 of the standard 5 slots first, leaving exactly one free.
    for (let i = 0; i < 4; i++) {
      const { error } = await client.from('links').insert({
        slug: `boundary-setup-${userId.slice(0, 8)}-${i}`,
        target_url: `https://example.com/boundary-setup-${i}`,
        user_id: userId,
        is_custom_slug: true,
      });
      expect(error).toBeNull();
    }

    const [resultA, resultB] = await Promise.all([
      client.from('links').insert({
        slug: `boundary-race-a-${userId.slice(0, 8)}`,
        target_url: 'https://example.com/boundary-race-a',
        user_id: userId,
        is_custom_slug: true,
      }),
      client.from('links').insert({
        slug: `boundary-race-b-${userId.slice(0, 8)}`,
        target_url: 'https://example.com/boundary-race-b',
        user_id: userId,
        is_custom_slug: true,
      }),
    ]);

    const outcomes = [resultA, resultB];
    const successes = outcomes.filter((r) => !r.error);
    const failures = outcomes.filter((r) => r.error);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].error?.code).toBe('BR002');
  });
});
