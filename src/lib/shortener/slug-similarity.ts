import type { createServiceClient } from '@/lib/supabase/service';

type ServiceClient = ReturnType<typeof createServiceClient>;

const CONFUSABLE_DIGITS: Record<string, string> = {
  '0': 'o',
  '1': 'l',
  '5': 's',
};

/**
 * Mirrors the `degarnished_slug` generated column exactly: strip separators,
 * fold the classic homograph digits (0/1/5) back to the letters they're
 * mistaken for. Operates on an already-normalized slug.
 */
export function degarnish(normalized: string): string {
  return normalized
    .replace(/[-_]/g, '')
    .replace(/[015]/g, (ch) => CONFUSABLE_DIGITS[ch] ?? ch);
}

export type SimilarityCheckResult = { tooSimilar: boolean };

/**
 * Global check (across ALL users, hence the service-role client, matching
 * resolve-slug.ts's reasoning) -- a custom slug that only differs from an
 * existing link by separators or 0/1/5-for-o/l/s substitution is exactly the
 * kind of near-duplicate this exists to block at creation time. Deliberately
 * doesn't return which slug it collided with -- the error message must stay
 * generic so this check can't be used to enumerate the namespace.
 */
export async function checkSlugSimilarity(
  supabase: ServiceClient,
  degarnishedCandidate: string,
): Promise<SimilarityCheckResult> {
  const { data } = await supabase
    .from('links')
    .select('id')
    .eq('degarnished_slug', degarnishedCandidate)
    .limit(1)
    .maybeSingle();

  return { tooSimilar: Boolean(data) };
}
