import { describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY);

/**
 * Spec test 7: two concurrent creations of the same custom slug must result
 * in exactly one success and one clean, exploitable error (a unique
 * violation, 23505) — never both succeeding (data corruption) and never an
 * unhandled crash. This is the actual database-level race POST /api/links'
 * "never pre-check with a SELECT" comment exists to survive: two genuinely
 * concurrent requests hit the same unique index at once.
 *
 * This exercises the database constraint directly (same approach as
 * tests/slug-normalization-collision.test.ts) rather than through the
 * authenticated POST /api/links route itself — reproducing that route's
 * cookie-based session outside a real browser isn't feasible in this
 * Vitest-only architecture (same limitation noted in
 * tests/cache-invalidation.test.ts), and the route's error handling
 * (catching 23505 -> 409, not 500) was verified manually. What matters for
 * this test is the invariant the database itself must uphold.
 *
 * Uses a verified (non-anonymous) user rather than an anonymous session:
 * the links_custom_slug_requires_verified_account RESTRICTIVE policy
 * (supabase/migrations/20260814090500_...) added for the account/quota
 * feature means an anonymous session can no longer create custom slugs at
 * all, which would otherwise mask the actual race this test targets (a
 * uniqueness collision, not the account-requirement rejection covered by
 * tests/custom-slug-requires-account.test.ts).
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('concurrent custom slug creation', () => {
  it('exactly one of two concurrent inserts for the same slug succeeds', async () => {
    const { userId, client } = await createVerifiedUser();

    const slug = `race-test-${crypto.randomUUID().slice(0, 8)}`;

    const [resultA, resultB] = await Promise.all([
      client.from('links').insert({
        slug,
        target_url: 'https://example.com/race-a',
        user_id: userId,
        is_custom_slug: true,
      }),
      client.from('links').insert({
        slug,
        target_url: 'https://example.com/race-b',
        user_id: userId,
        is_custom_slug: true,
      }),
    ]);

    const outcomes = [resultA, resultB];
    const successes = outcomes.filter((r) => !r.error);
    const failures = outcomes.filter((r) => r.error);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    // A clean, exploitable error — not an unhandled crash — is what lets
    // POST /api/links turn this into a 409 instead of a 500.
    expect(failures[0].error?.code).toBe('23505');
  });
});
