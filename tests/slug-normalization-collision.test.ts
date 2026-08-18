import { describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY);

/**
 * Spec test 1: uniqueness is case/Unicode-form insensitive — "MonCV" and
 * "moncv" must never both exist, since a visitor perceives them as the same
 * link. Enforced by the `slug_normalized` generated column's unique index,
 * not by application code, so this hits the database directly.
 *
 * Uses a verified (non-anonymous) user rather than an anonymous session:
 * the links_custom_slug_requires_verified_account RESTRICTIVE policy
 * (supabase/migrations/20260814090500_...) added for the account/quota
 * feature means an anonymous session can no longer create custom slugs at
 * all, which would otherwise reject the very first insert here for an
 * unrelated reason before the normalization collision this test targets is
 * ever reached.
 *
 * Requires the local Supabase stack: `npx supabase start`, then
 * `npx supabase status -o env` to populate .env.test.local.
 */
describe.skipIf(!hasLocalStack)('slug normalization collision', () => {
  it('rejects a second slug that only differs in case', async () => {
    const { userId, client } = await createVerifiedUser();

    const base = `Collision-Test-${crypto.randomUUID().slice(0, 8)}`;
    const { error: firstError } = await client.from('links').insert({
      slug: base,
      target_url: 'https://example.com/first',
      user_id: userId,
      is_custom_slug: true,
    });
    expect(firstError).toBeNull();

    const { error: secondError } = await client.from('links').insert({
      slug: base.toLowerCase(),
      target_url: 'https://example.com/second',
      user_id: userId,
      is_custom_slug: true,
    });
    expect(secondError).not.toBeNull();
    expect(secondError?.code).toBe('23505');
  });

  it('allows two slugs that are genuinely different once normalized', async () => {
    const { userId, client } = await createVerifiedUser();

    const suffix = crypto.randomUUID().slice(0, 8);
    const { error: firstError } = await client.from('links').insert({
      slug: `distinct-a-${suffix}`,
      target_url: 'https://example.com/a',
      user_id: userId,
      is_custom_slug: true,
    });
    expect(firstError).toBeNull();

    const { error: secondError } = await client.from('links').insert({
      slug: `distinct-b-${suffix}`,
      target_url: 'https://example.com/b',
      user_id: userId,
      is_custom_slug: true,
    });
    expect(secondError).toBeNull();
  });
});
