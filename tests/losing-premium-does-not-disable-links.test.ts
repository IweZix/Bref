import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

/**
 * Addendum §5.4 / spec test §7.8: losing premium status must never delete
 * or disable a user's existing links, even ones created while over the
 * standard quota -- only the creation of *new* custom slugs is blocked
 * until the user is back under the limit. Destroying already-shared links
 * because a flag flipped would be a materially worse outcome than a
 * slightly-over-quota account.
 *
 * Temporarily lowers the premium tier default (like
 * tests/quota-resolution-order.test.ts) so this test doesn't need to create
 * dozens of links to get "over the standard quota of 5" — restored in
 * afterAll.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('losing premium does not disable links', () => {
  const url = SUPABASE_URL as string;
  const serviceRoleKey = SERVICE_ROLE_KEY as string;
  const service = createClient(url, serviceRoleKey);

  let originalPremiumQuota: number;

  beforeAll(async () => {
    const { data } = await service
      .from('quota_tiers')
      .select('custom_slug_quota')
      .eq('tier', 'premium')
      .single();
    originalPremiumQuota = data?.custom_slug_quota ?? 20;
    await service
      .from('quota_tiers')
      .update({ custom_slug_quota: 6 })
      .eq('tier', 'premium');
  });

  afterAll(async () => {
    await service
      .from('quota_tiers')
      .update({ custom_slug_quota: originalPremiumQuota })
      .eq('tier', 'premium');
  });

  it('links created over the standard quota stay active after premium is revoked', async () => {
    const { userId, client } = await createVerifiedUser();
    await service
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId);

    const slugs: string[] = [];
    for (let i = 0; i < 6; i++) {
      const slug = `lose-premium-${userId.slice(0, 8)}-${i}`;
      slugs.push(slug);
      const { error } = await client.from('links').insert({
        slug,
        target_url: `https://example.com/lose-premium-${i}`,
        user_id: userId,
        is_custom_slug: true,
      });
      expect(error, `insert #${i + 1} should succeed while premium`).toBeNull();
    }

    await service
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', userId);

    const { data: remainingLinks } = await service
      .from('links')
      .select('slug, is_active')
      .eq('user_id', userId)
      .eq('is_custom_slug', true);

    expect(remainingLinks).toHaveLength(6);
    for (const link of remainingLinks ?? []) {
      expect(link.is_active).toBe(true);
    }

    // Already over the (now-applicable) standard quota of 5 — any new
    // custom slug must be blocked until the user deletes down to the limit.
    const { error: newSlugError } = await client.from('links').insert({
      slug: `lose-premium-${userId.slice(0, 8)}-new`,
      target_url: 'https://example.com/lose-premium-new',
      user_id: userId,
      is_custom_slug: true,
    });
    expect(newSlugError?.code).toBe('BR002');
  });
});
