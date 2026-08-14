import type { User } from '@supabase/supabase-js';
import { getQuotaTierDefaults } from '@/lib/shortener/custom-slug-quota';
import type { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CustomSlugEligibility =
  | { eligible: true; quota: number; used: number }
  | { eligible: false; reason: 'requires-account' }
  | { eligible: false; reason: 'quota-exceeded'; quota: number; used: number };

/**
 * Mirrors the DB-enforced rules (the links_custom_slug_requires_verified_account
 * RESTRICTIVE policy + the enforce_custom_slug_quota() trigger) as a fast,
 * read-only pre-check -- deliberately separate from
 * validate-custom-slug-candidate.ts, which stays scoped to "is this string a
 * valid slug." The database stays authoritative for the concurrent boundary
 * case regardless; this just avoids a round trip through a Postgres error
 * for the common case.
 */
export async function checkCustomSlugEligibility(
  supabase: SupabaseServerClient,
  user: User,
): Promise<CustomSlugEligibility> {
  if (user.is_anonymous) {
    return { eligible: false, reason: 'requires-account' };
  }

  const [profileResult, tiers, countResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_premium, custom_slug_quota')
      .eq('id', user.id)
      .maybeSingle(),
    getQuotaTierDefaults(supabase),
    supabase
      .from('links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_custom_slug', true),
  ]);

  const profile = profileResult.data as {
    is_premium: boolean;
    custom_slug_quota: number | null;
  } | null;

  const tierDefault = profile?.is_premium ? tiers.premium : tiers.standard;
  const quota = profile?.custom_slug_quota ?? tierDefault;
  const used = countResult.count ?? 0;

  if (used >= quota) {
    return { eligible: false, reason: 'quota-exceeded', quota, used };
  }
  return { eligible: true, quota, used };
}
