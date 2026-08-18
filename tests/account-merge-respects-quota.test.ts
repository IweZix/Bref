import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createVerifiedUser } from './helpers/create-verified-user';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

/**
 * Addendum §3.3 / spec test §7.7: the cross-device merge transfer must
 * respect the target account's quota -- move what fits, report the rest as
 * skipped, never silently truncate. merge_anonymous_links() (supabase/
 * migrations/20260814090700_...) is called directly here (as
 * src/app/api/account/merge/route.ts does via the service-role client),
 * bypassing the token/HTTP layer to isolate the transfer logic itself.
 *
 * Both source and target are verified accounts (createVerifiedUser), each
 * seeding its own links through its own RLS-scoped client rather than a
 * live anonymous session -- merge_anonymous_links() only ever moves rows by
 * user_id and doesn't itself inspect is_anonymous, so this isolates the
 * reassignment/quota logic under test from the (separately-tested, see
 * tests/custom-slug-requires-account.test.ts) rule that anonymous sessions
 * can't create custom slugs at all. In the real cross-device flow the
 * "source" is a still-anonymous session; here it's simply whichever account
 * is losing its links.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('account merge respects quota', () => {
  const serviceRoleKey = SERVICE_ROLE_KEY as string;
  const service = createClient(SUPABASE_URL as string, serviceRoleKey);

  it('moves random links unconditionally and custom links up to the target’s free slots, oldest first', async () => {
    const { userId: sourceId, client: sourceClient } =
      await createVerifiedUser();

    // 2 random links (always fully moved) + 3 custom links (only 2 of the
    // target's 3 free slots exist), oldest-first via explicit created_at so
    // the "which ones move" assertion below is deterministic.
    const now = Date.now();
    for (const label of ['a', 'b']) {
      const { error } = await sourceClient.from('links').insert({
        slug: `merge-src-random-${label}-${sourceId.slice(0, 8)}`,
        target_url: `https://example.com/merge-random-${label}`,
        user_id: sourceId,
        is_custom_slug: false,
      });
      expect(error).toBeNull();
    }
    const customSlugs = ['oldest', 'middle', 'newest'].map(
      (label) => `merge-src-custom-${label}-${sourceId.slice(0, 8)}`,
    );
    for (const [i, slug] of customSlugs.entries()) {
      const { error } = await sourceClient.from('links').insert({
        slug,
        target_url: `https://example.com/${slug}`,
        user_id: sourceId,
        is_custom_slug: true,
        created_at: new Date(now + i * 1000).toISOString(),
      });
      expect(error).toBeNull();
    }

    const { userId: targetId } = await createVerifiedUser();
    // 2 of the standard quota's 5 slots already used, leaving exactly 3
    // free -- less than the source's 3 custom links wouldn't test partial
    // refusal, so pin the target's override to leave exactly 2 free slots.
    await service
      .from('profiles')
      .update({ custom_slug_quota: 2 })
      .eq('id', targetId);

    const { data: result, error } = await service
      .rpc('merge_anonymous_links', {
        p_source_user_id: sourceId,
        p_target_user_id: targetId,
      })
      .single();

    expect(error).toBeNull();
    expect(result).toMatchObject({
      reassigned_random: 2,
      reassigned_custom: 2,
      skipped_custom: 1,
    });

    const { data: sourceRemaining } = await service
      .from('links')
      .select('slug')
      .eq('user_id', sourceId);
    expect(sourceRemaining).toHaveLength(1);
    expect(sourceRemaining?.[0].slug).toBe(customSlugs[2]); // newest stays

    const { data: targetLinks } = await service
      .from('links')
      .select('slug')
      .eq('user_id', targetId);
    const targetSlugs = (targetLinks ?? []).map((l) => l.slug);
    expect(targetSlugs).toEqual(
      expect.arrayContaining([customSlugs[0], customSlugs[1]]),
    );
    expect(targetSlugs).not.toContain(customSlugs[2]);
  });
});
