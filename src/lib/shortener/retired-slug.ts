import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import type { createServiceClient } from '@/lib/supabase/service';

type ServiceClient = ReturnType<typeof createServiceClient>;

export type RetiredSlugConflict = { blocked: false } | { blocked: true };

/**
 * Non-reuse rule: a retired custom slug is blocked for everyone except the
 * session that retired it. Its own small module (not inlined in a route) so
 * it's independently testable against a real Supabase instance -- see
 * tests/slug-reclaim.test.ts.
 */
export async function checkRetiredSlugConflict(
  supabase: ServiceClient,
  requestedSlug: string,
  userId: string,
): Promise<RetiredSlugConflict> {
  const { data } = await supabase
    .from('retired_slugs')
    .select('retired_by')
    .eq('slug_normalized', normalizeSlug(requestedSlug))
    .maybeSingle();

  if (!data) return { blocked: false };
  return { blocked: data.retired_by !== userId };
}

/**
 * Called from DELETE /api/links/[id] for custom slugs only, after the
 * RLS-scoped delete has already succeeded. Never throws -- the link is gone
 * either way, so a failure here shouldn't fail the delete response, only get
 * logged. See the accepted race-window note in the plan for this feature.
 */
export async function retireSlug(
  supabase: ServiceClient,
  params: { slug: string; userId: string },
): Promise<void> {
  const { error } = await supabase.from('retired_slugs').upsert(
    {
      slug: params.slug,
      retired_by: params.userId,
      retired_at: new Date().toISOString(),
    },
    { onConflict: 'slug_normalized' },
  );
  if (error) {
    console.error('Failed to record slug retirement', error);
  }
}
