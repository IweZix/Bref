import type { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type QuotaTier = 'standard' | 'premium';

// Only used if public.quota_tiers is unreachable/empty -- should never
// happen outside a broken migration, but keeps this module from throwing
// on a transient read failure. Not the source of truth; see below.
const FALLBACK_QUOTA: Record<QuotaTier, number> = {
  standard: 5,
  premium: 20,
};

/**
 * Reads the two tier defaults from public.quota_tiers -- the single source
 * of truth also read by enforce_custom_slug_quota() in
 * supabase/migrations/20260814090400_custom_slug_quota_trigger.sql. Never
 * hardcode a quota number anywhere else.
 */
export async function getQuotaTierDefaults(
  supabase: SupabaseServerClient,
): Promise<Record<QuotaTier, number>> {
  const { data, error } = await supabase
    .from('quota_tiers')
    .select('tier, custom_slug_quota');

  if (error || !data) return { ...FALLBACK_QUOTA };

  const result = { ...FALLBACK_QUOTA };
  for (const row of data as { tier: string; custom_slug_quota: number }[]) {
    if (row.tier === 'standard' || row.tier === 'premium') {
      result[row.tier] = row.custom_slug_quota;
    }
  }
  return result;
}
