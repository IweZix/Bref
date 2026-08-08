import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/service';

export type ResolvedLink = {
  id: string;
  targetUrl: string;
};

async function resolveSlugFromDb(slug: string): Promise<ResolvedLink | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('links')
    .select('id, target_url, is_active, expires_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at) <= new Date()) return null;

  return { id: data.id, targetUrl: data.target_url };
}

/**
 * Service-role lookup: a visitor following a short link isn't its RLS owner
 * but must still be able to resolve it. Cached and tagged per slug so a
 * popular link doesn't burn a DB read (and egress) on every single click —
 * `src/app/api/links/[id]/route.ts` calls `revalidateTag` on any change.
 * Deliberately not a module-level Map: each serverless instance would have
 * its own, so an update wouldn't propagate everywhere.
 */
export async function resolveSlug(slug: string): Promise<ResolvedLink | null> {
  const cached = unstable_cache(
    () => resolveSlugFromDb(slug),
    ['resolve-slug', slug],
    {
      tags: [`link:${slug}`],
    },
  );
  return cached();
}
