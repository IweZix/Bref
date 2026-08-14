import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

async function insertCustomSlug(
  client: Awaited<ReturnType<typeof createVerifiedUser>>['client'],
  userId: string,
  slug: string,
) {
  return client.from('links').insert({
    slug,
    target_url: `https://example.com/${slug}`,
    user_id: userId,
    is_custom_slug: true,
  });
}

/**
 * Addendum §5.2: quota resolution order is profiles.custom_slug_quota
 * (per-user override) -> premium tier default -> standard tier default.
 * enforce_custom_slug_quota() (supabase/migrations/20260814090400_...)
 * reads public.quota_tiers for the two tier defaults -- this suite
 * temporarily lowers the premium tier value to keep the boundary small and
 * the test fast, restoring it in afterAll so it doesn't leak into other
 * test files (vitest.config.mts runs files sequentially, not in parallel,
 * but a failed restore would still corrupt later runs of this same file).
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('custom slug quota resolution order', () => {
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
      .update({ custom_slug_quota: 2 })
      .eq('tier', 'premium');
  });

  afterAll(async () => {
    await service
      .from('quota_tiers')
      .update({ custom_slug_quota: originalPremiumQuota })
      .eq('tier', 'premium');
  });

  it('a per-user override takes precedence over the standard default', async () => {
    const { userId, client } = await createVerifiedUser();
    await service
      .from('profiles')
      .update({ custom_slug_quota: 1 })
      .eq('id', userId);

    const first = await insertCustomSlug(
      client,
      userId,
      `override-${userId.slice(0, 8)}-a`,
    );
    expect(first.error).toBeNull();

    const second = await insertCustomSlug(
      client,
      userId,
      `override-${userId.slice(0, 8)}-b`,
    );
    expect(second.error?.code).toBe('BR002');
  });

  it('a per-user override takes precedence over the premium default', async () => {
    const { userId, client } = await createVerifiedUser();
    await service
      .from('profiles')
      .update({ is_premium: true, custom_slug_quota: 1 })
      .eq('id', userId);

    const first = await insertCustomSlug(
      client,
      userId,
      `override-premium-${userId.slice(0, 8)}-a`,
    );
    expect(first.error).toBeNull();

    const second = await insertCustomSlug(
      client,
      userId,
      `override-premium-${userId.slice(0, 8)}-b`,
    );
    expect(second.error?.code).toBe('BR002');
  });

  it('without an override, is_premium selects the premium tier default', async () => {
    const { userId, client } = await createVerifiedUser();
    await service
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId);

    // Premium tier temporarily set to 2 in beforeAll.
    const first = await insertCustomSlug(
      client,
      userId,
      `premium-tier-${userId.slice(0, 8)}-a`,
    );
    expect(first.error).toBeNull();
    const second = await insertCustomSlug(
      client,
      userId,
      `premium-tier-${userId.slice(0, 8)}-b`,
    );
    expect(second.error).toBeNull();

    const third = await insertCustomSlug(
      client,
      userId,
      `premium-tier-${userId.slice(0, 8)}-c`,
    );
    expect(third.error?.code).toBe('BR002');
  });

  it('without an override or premium, the standard tier default applies', async () => {
    const { userId, client } = await createVerifiedUser();

    for (let i = 0; i < 5; i++) {
      const { error } = await insertCustomSlug(
        client,
        userId,
        `standard-tier-${userId.slice(0, 8)}-${i}`,
      );
      expect(error).toBeNull();
    }

    const { error } = await insertCustomSlug(
      client,
      userId,
      `standard-tier-${userId.slice(0, 8)}-over`,
    );
    expect(error?.code).toBe('BR002');
  });
});
