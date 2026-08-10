import { unstable_cache } from 'next/cache';
import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import { createServiceClient } from '@/lib/supabase/service';

export type ResolvedLink = {
  id: string;
  targetUrl: string;
  requiresInterstitial: boolean;
};

export type SlugLookupResult =
  | { status: 'active'; link: ResolvedLink }
  | { status: 'retired' }
  | { status: 'not_found' };

async function resolveSlugFromDb(slug: string): Promise<SlugLookupResult> {
  const supabase = createServiceClient();
  const normalized = normalizeSlug(slug);

  const { data, error } = await supabase
    .from('links')
    .select('id, target_url, is_active, expires_at, requires_interstitial')
    .eq('slug_normalized', normalized)
    .maybeSingle();

  if (data) {
    if (!data.is_active) return { status: 'not_found' };
    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      return { status: 'not_found' };
    }
    return {
      status: 'active',
      link: {
        id: data.id,
        targetUrl: data.target_url,
        requiresInterstitial: data.requires_interstitial,
      },
    };
  }
  if (error) return { status: 'not_found' };

  // No live link — check whether this slug was a custom slug that got
  // deleted, in which case it must never silently look like it never
  // existed (see the non-reuse-after-deletion design).
  const { data: retired } = await supabase
    .from('retired_slugs')
    .select('slug_normalized')
    .eq('slug_normalized', normalized)
    .maybeSingle();

  return retired ? { status: 'retired' } : { status: 'not_found' };
}

/**
 * Service-role lookup: a visitor following a short link isn't its RLS owner
 * but must still be able to resolve it. Cached and tagged per slug so a
 * popular link doesn't burn a DB read (and egress) on every single click —
 * `src/app/api/links/[id]/route.ts` calls `revalidateTag` on any change.
 * Deliberately not a module-level Map: each serverless instance would have
 * its own, so an update wouldn't propagate everywhere.
 */
export async function resolveSlug(slug: string): Promise<SlugLookupResult> {
  const cached = unstable_cache(
    () => resolveSlugFromDb(slug),
    ['resolve-slug', slug],
    {
      tags: [`link:${slug}`],
    },
  );
  return cached();
}
