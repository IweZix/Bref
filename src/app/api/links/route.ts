import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isReservedSlug } from '@/lib/shortener/reserved-slugs';
import { generateSlug } from '@/lib/shortener/slug';
import { validateDestinationUrl } from '@/lib/shortener/validate-destination';
import { createClient } from '@/lib/supabase/server';

// "A handful" per the product decision: random slugs stay uncapped, custom
// (human-chosen) slugs are capped per anonymous session to blunt squatting.
const CUSTOM_SLUG_CAP_PER_SESSION = 5;
const MAX_SLUG_GENERATION_ATTEMPTS = 3;
const CUSTOM_SLUG_PATTERN = /^[a-zA-Z0-9-]{3,32}$/;
const UNIQUE_VIOLATION = '23505';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function insertLink(
  supabase: SupabaseServerClient,
  params: {
    slug: string;
    targetUrl: string;
    userId: string;
    title: string | null;
    isCustomSlug: boolean;
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

  if (typeof body.slug === 'string' && body.slug.trim()) {
    const requestedSlug = body.slug.trim();

    if (!CUSTOM_SLUG_PATTERN.test(requestedSlug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 },
      );
    }
    if (isReservedSlug(requestedSlug)) {
      return NextResponse.json(
        { error: 'This slug is reserved' },
        { status: 400 },
      );
    }

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
