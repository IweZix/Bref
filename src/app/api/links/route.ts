import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
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

// "A handful" per the product decision: random slugs stay uncapped, custom
// (human-chosen) slugs are capped per anonymous session to blunt squatting.
const CUSTOM_SLUG_CAP_PER_SESSION = 5;
const MAX_SLUG_GENERATION_ATTEMPTS = 3;
const UNIQUE_VIOLATION = '23505';

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

    const validation = await validateCustomSlugCandidate(
      createServiceClient(),
      body.slug,
      user.id,
      new URL(destination.url).hostname,
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: CUSTOM_SLUG_VALIDATION_ERRORS[validation.reason] },
        { status: 400 },
      );
    }
    const requestedSlug = validation.slug;

    const { count, error: countError } = await supabase
      .from('links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_custom_slug', true);
    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check custom slug quota' },
        { status: 500 },
      );
    }
    if ((count ?? 0) >= CUSTOM_SLUG_CAP_PER_SESSION) {
      return NextResponse.json(
        {
          error: `Custom slug limit reached (${CUSTOM_SLUG_CAP_PER_SESSION} per session)`,
        },
        { status: 429 },
      );
    }

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
          { error: 'This slug is already taken' },
          { status: 409 },
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
