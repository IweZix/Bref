import { NextResponse } from 'next/server';
import { checkCustomSlugEligibility } from '@/lib/shortener/custom-slug-eligibility';
import { createClient } from '@/lib/supabase/server';

/**
 * Cookie-authenticated and RLS-scoped by construction (checkCustomSlugEligibility
 * only ever reads the caller's own profile/link rows) -- no IDOR risk from
 * exposing this to any signed-in caller, anonymous or not.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const eligibility = await checkCustomSlugEligibility(supabase, user);

  if (!eligibility.eligible) {
    if (eligibility.reason === 'requires-account') {
      return NextResponse.json({
        eligible: false,
        reason: eligibility.reason,
        isAnonymous: true,
      });
    }
    return NextResponse.json({
      eligible: false,
      reason: eligibility.reason,
      quota: eligibility.quota,
      used: eligibility.used,
      isAnonymous: false,
    });
  }

  return NextResponse.json({
    eligible: true,
    quota: eligibility.quota,
    used: eligibility.used,
    isAnonymous: false,
  });
}
