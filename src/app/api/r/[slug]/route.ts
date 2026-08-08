import { after, NextResponse } from 'next/server';
import { recordClick } from '@/lib/shortener/record-click';
import { resolveSlug } from '@/lib/shortener/resolve-slug';
import { routing } from '@/localization/routing';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const link = await resolveSlug(slug);

  if (!link) {
    const notFoundUrl = new URL(
      `/${routing.defaultLocale}/link-not-found`,
      request.url,
    );
    return NextResponse.redirect(notFoundUrl, 307);
  }

  // Scheduled after the response is sent — never block the redirect on the write,
  // and never let a recording failure affect it. 307, never 301/308: a permanent
  // redirect gets cached by the browser, so repeat visits (and any destination or
  // is_active change) would silently stop reaching this route.
  after(() => recordClick(link.id, request));

  return NextResponse.redirect(link.targetUrl, 307);
}
