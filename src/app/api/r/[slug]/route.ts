import { after, NextResponse } from 'next/server';
import { parseClickSource } from '@/lib/shortener/click-source';
import { recordClick } from '@/lib/shortener/record-click';
import { resolveSlug } from '@/lib/shortener/resolve-slug';
import { renderRetiredSlugHtml } from '@/lib/shortener/retired-slug-page';
import { routing } from '@/localization/routing';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const result = await resolveSlug(slug);
  const requestUrl = new URL(request.url);

  if (result.status === 'not_found') {
    const notFoundUrl = new URL(
      `/${routing.defaultLocale}/link-not-found`,
      request.url,
    );
    notFoundUrl.searchParams.set('slug', slug);
    return NextResponse.redirect(notFoundUrl, 307);
  }

  if (result.status === 'retired') {
    // A genuine 410 on the actual response — semantically correct (the
    // resource existed and is gone for good) and distinguishable from a
    // slug that was never claimed, unlike the 307-to-not-found path above.
    return new NextResponse(renderRetiredSlugHtml(slug), {
      status: 410,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const { link } = result;

  const rawSource = requestUrl.searchParams.get('s');
  const skipInterstitial =
    requestUrl.searchParams.get('skip_interstitial') === '1';
  if (link.requiresInterstitial && !skipInterstitial) {
    const interstitialUrl = new URL(
      `/${routing.defaultLocale}/interstitial`,
      request.url,
    );
    interstitialUrl.searchParams.set('slug', slug);
    // Carried through so a QR-sourced visit that has to pass through the
    // interstitial still records as source: 'qr' on the far side, instead
    // of silently losing the marker mid-redirect.
    if (rawSource) interstitialUrl.searchParams.set('s', rawSource);
    return NextResponse.redirect(interstitialUrl, 307);
  }

  // Scheduled after the response is sent — never block the redirect on the write,
  // and never let a recording failure affect it. 307, never 301/308: a permanent
  // redirect gets cached by the browser, so repeat visits (and any destination or
  // is_active change) would silently stop reaching this route.
  after(() => recordClick(link.id, request, parseClickSource(rawSource)));

  return NextResponse.redirect(link.targetUrl, 307);
}
