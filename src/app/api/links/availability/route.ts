import { NextResponse } from 'next/server';
import { checkCustomSlugEligibility } from '@/lib/shortener/custom-slug-eligibility';
import { checkCustomSlugRateLimit } from '@/lib/shortener/custom-slug-rate-limit';
import { getClientIp } from '@/lib/shortener/geo';
import { hashIp } from '@/lib/shortener/ip-hash';
import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import { suggestSlugAlternatives } from '@/lib/shortener/slug-suggestions';
import { validateCustomSlugCandidate } from '@/lib/shortener/validate-custom-slug-candidate';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Indicative only — a live-typing convenience, never the authority on
 * uniqueness (that's the UNIQUE constraint, enforced at insert time in
 * POST /api/links). Never returns target_url, created_at, or owner info:
 * only a boolean and a category-level reason, so this can't be used to
 * enumerate the namespace or learn anything about who owns what.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ipHash = await hashIp(getClientIp(request));
  const rateLimit = await checkCustomSlugRateLimit({
    sessionId: user.id,
    ipHash,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }

  const eligibility = await checkCustomSlugEligibility(supabase, user);
  if (!eligibility.eligible) {
    return NextResponse.json({
      available: false,
      reason: eligibility.reason,
    });
  }

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const service = createServiceClient();
  const normalized = normalizeSlug(slug);

  const validation = await validateCustomSlugCandidate(service, slug, user.id);
  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      reason: validation.reason,
      suggestions: suggestSlugAlternatives(normalized),
    });
  }

  const { data: existing } = await service
    .from('links')
    .select('id')
    .eq('slug_normalized', validation.slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      available: false,
      reason: 'taken',
      suggestions: suggestSlugAlternatives(validation.slug),
    });
  }

  return NextResponse.json({ available: true });
}
