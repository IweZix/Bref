import { describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

const STANDARD_QUOTA = 5; // public.quota_tiers seed value for tier = 'standard'

/**
 * Addendum spec test §7.3: the standard quota of 5 custom slugs is applied
 * in the database (enforce_custom_slug_quota(), supabase/migrations/
 * 20260814090400_...), not just by application code in POST /api/links --
 * verified here by inserting directly, bypassing the route entirely.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('custom slug quota enforcement', () => {
  it('a verified account can create up to the standard quota, and no more', async () => {
    const { userId, client } = await createVerifiedUser();

    for (let i = 0; i < STANDARD_QUOTA; i++) {
      const { error } = await client.from('links').insert({
        slug: `quota-test-${userId.slice(0, 8)}-${i}`,
        target_url: `https://example.com/quota-${i}`,
        user_id: userId,
        is_custom_slug: true,
      });
      expect(error, `insert #${i + 1} should succeed`).toBeNull();
    }

    const { error: overQuotaError } = await client.from('links').insert({
      slug: `quota-test-${userId.slice(0, 8)}-over`,
      target_url: 'https://example.com/quota-over',
      user_id: userId,
      is_custom_slug: true,
    });

    expect(overQuotaError).not.toBeNull();
    expect(overQuotaError?.code).toBe('BR002');
  });

  it('random slugs are never counted against the custom slug quota', async () => {
    const { userId, client } = await createVerifiedUser();

    for (let i = 0; i < STANDARD_QUOTA; i++) {
      await client.from('links').insert({
        slug: `quota-test-random-${userId.slice(0, 8)}-${i}`,
        target_url: `https://example.com/quota-random-${i}`,
        user_id: userId,
        is_custom_slug: true,
      });
    }

    // Quota is exhausted for custom slugs, but random slugs are uncapped.
    const { error } = await client.from('links').insert({
      slug: `quota-test-random-only-${userId.slice(0, 8)}`,
      target_url: 'https://example.com/quota-random-only',
      user_id: userId,
      is_custom_slug: false,
    });
    expect(error).toBeNull();
  });

  it('deleting a custom-slug link frees a quota slot', async () => {
    const { userId, client } = await createVerifiedUser();

    const slugs: string[] = [];
    for (let i = 0; i < STANDARD_QUOTA; i++) {
      const slug = `quota-test-free-${userId.slice(0, 8)}-${i}`;
      slugs.push(slug);
      const { error } = await client.from('links').insert({
        slug,
        target_url: `https://example.com/quota-free-${i}`,
        user_id: userId,
        is_custom_slug: true,
      });
      expect(error).toBeNull();
    }

    // Delete one of them via the owner's own RLS-scoped client, mirroring
    // how the real DELETE route works (src/app/api/links/[id]/route.ts runs
    // as the cookie-authenticated caller, not service role, for an
    // owner-scoped delete like this -- it separately retires the slug in
    // public.retired_slugs, irrelevant to the quota count tested here).
    const { error: deleteError } = await client
      .from('links')
      .delete()
      .eq('slug', slugs[0]);
    expect(deleteError).toBeNull();

    const { error } = await client.from('links').insert({
      slug: `quota-test-free-${userId.slice(0, 8)}-new`,
      target_url: 'https://example.com/quota-free-new',
      user_id: userId,
      is_custom_slug: true,
    });
    expect(error).toBeNull();
  });
});
