import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { checkCustomSlugEligibility } from '@/lib/shortener/custom-slug-eligibility';
import { checkCustomSlugRateLimit } from '@/lib/shortener/custom-slug-rate-limit';
import { getClientIp } from '@/lib/shortener/geo';
import { hashIp } from '@/lib/shortener/ip-hash';
import { checkRateLimit } from '@/lib/shortener/rate-limit';
import { generateSlug } from '@/lib/shortener/slug';
import {
  type CustomSlugValidationReason,
  validateCustomSlugCandidate,
} from '@/lib/shortener/validate-custom-slug-candidate';
import { validateDestinationUrl } from '@/lib/shortener/validate-destination';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const MAX_SLUG_GENERATION_ATTEMPTS = 3;
const UNIQUE_VIOLATION = '23505';
// Raised by enforce_custom_slug_quota() (supabase/migrations/20260814090400_...)
// -- the DB-enforced, concurrency-safe replacement for the old app-level
// SELECT-count-then-INSERT check.
const CUSTOM_SLUG_QUOTA_EXCEEDED = 'BR002';
// Raised by the links_custom_slug_requires_verified_account RESTRICTIVE
// policy (supabase/migrations/20260814090500_...). It's the only
// RESTRICTIVE policy touching links inserts today, so this code is a safe
// inference -- revisit if that ever changes.
const RESTRICTED_BY_RLS = '42501';

const CUSTOM_SLUG_VALIDATION_ERRORS: Record<
  CustomSlugValidationReason,
  string
> = {
  'invalid-format': 'Invalid slug format',
  reserved: 'This slug is reserved',
  'too-similar': 'This slug looks too similar to an existing link',
  retired: 'This slug was previously used and is no longer available',
  'brand-mismatch':
    "This slug looks like it impersonates a brand but doesn't point to its real domain",
};

const CUSTOM_SLUG_ELIGIBILITY_ERRORS: Record<
  'requires-account' | 'quota-exceeded',
  string
> = {
  'requires-account': 'Creating a custom link requires a verified account',
  'quota-exceeded': 'Custom slug quota reached',
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function insertLink(
  supabase: SupabaseServerClient,
  params: {
    slug: string;
    targetUrl: string;
    userId: string;
    title: string | null;
    isCustomSlug: boolean;
    requiresInterstitial: boolean;
  },
) {
  return supabase
    .from('links')
    .insert({
      slug: params.slug,
      target_url: params.targetUrl,
      user_id: params.userId,
      title: params.title,
      is_custom_slug: params.isCustomSlug,
      requires_interstitial: params.requiresInterstitial,
    })
    .select()
    .single();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ipHash = await hashIp(getClientIp(request));
  const rateLimit = await checkRateLimit({ sessionId: user.id, ipHash });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.targetUrl !== 'string') {
    return NextResponse.json(
      { error: 'targetUrl is required' },
      { status: 400 },
    );
  }

  const ownHost = request.headers.get('host') ?? undefined;
  const destination = validateDestinationUrl(body.targetUrl, ownHost);
  if (!destination.valid) {
    return NextResponse.json({ error: destination.reason }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : null;

  const requiresInterstitial = body.requiresInterstitial === true;

  if (typeof body.slug === 'string' && body.slug.trim()) {
    const attemptLimit = await checkCustomSlugRateLimit({
      sessionId: user.id,
      ipHash,
    });
    if (!attemptLimit.allowed) {
      return NextResponse.json({ error: attemptLimit.reason }, { status: 429 });
    }

    // Fast pre-check mirroring the DB-enforced rules, so the common case
    // never round-trips through a Postgres error. The insert below stays
    // authoritative for the concurrent boundary case regardless.
    const eligibility = await checkCustomSlugEligibility(supabase, user);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: CUSTOM_SLUG_ELIGIBILITY_ERRORS[eligibility.reason],
          reason: eligibility.reason,
        },
        { status: eligibility.reason === 'requires-account' ? 403 : 429 },
      );
    }

    const validation = await validateCustomSlugCandidate(
      createServiceClient(),
      body.slug,
      user.id,
      new URL(destination.url).hostname,
    );
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: CUSTOM_SLUG_VALIDATION_ERRORS[validation.reason],
          reason: validation.reason,
        },
        { status: 400 },
      );
    }
    const requestedSlug = validation.slug;

    const { data: link, error } = await insertLink(supabase, {
      slug: requestedSlug,
      targetUrl: destination.url,
      userId: user.id,
      title,
      isCustomSlug: true,
      requiresInterstitial,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return NextResponse.json(
          { error: 'This slug is already taken', reason: 'taken' },
          { status: 409 },
        );
      }
      if (error.code === CUSTOM_SLUG_QUOTA_EXCEEDED) {
        return NextResponse.json(
          {
            error: CUSTOM_SLUG_ELIGIBILITY_ERRORS['quota-exceeded'],
            reason: 'quota-exceeded',
          },
          { status: 429 },
        );
      }
      if (error.code === RESTRICTED_BY_RLS) {
        return NextResponse.json(
          {
            error: CUSTOM_SLUG_ELIGIBILITY_ERRORS['requires-account'],
            reason: 'requires-account',
          },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: 'Failed to create link' },
        { status: 500 },
      );
    }

    revalidatePath('/[locale]/dashboard', 'page');
    return NextResponse.json({ link }, { status: 201 });
  }

  // Random slug: retry on collision, never pre-check availability with a SELECT
  // first — that's a race condition between two simultaneous creations.
  for (let attempt = 0; attempt < MAX_SLUG_GENERATION_ATTEMPTS; attempt++) {
    const { data: link, error } = await insertLink(supabase, {
      slug: generateSlug(),
      targetUrl: destination.url,
      userId: user.id,
      title,
      isCustomSlug: false,
      requiresInterstitial,
    });

    if (!error) {
      revalidatePath('/[locale]/dashboard', 'page');
      return NextResponse.json({ link }, { status: 201 });
    }
    if (error.code !== UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: 'Failed to create link' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: 'Could not generate a unique slug, please try again' },
    { status: 500 },
  );
}
