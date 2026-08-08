// proxy.ts

import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { isShortLinkPath } from '@/lib/shortener/is-short-link-path';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/localization/routing';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bare-root short links (e.g. /aB3xY9z) never get a locale prefix or an
  // anonymous session — rewrite straight to the redirect route, transparent
  // to the browser's URL bar, before next-intl ever sees the request.
  if (isShortLinkPath(pathname)) {
    const slug = pathname.slice(1);
    const url = request.nextUrl.clone();
    url.pathname = `/api/r/${slug}`;
    return NextResponse.rewrite(url);
  }

  const supabaseResponse = await updateSession(request);
  const response = intlMiddleware(request);

  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
