import { isReservedSlug } from '@/lib/shortener/reserved-slugs';
import { routing } from '@/localization/routing';

const SLUG_PATTERN = /^\/[a-zA-Z0-9_-]+$/;

/**
 * True for a bare-root, single-segment path that should be treated as a short
 * link (e.g. `/aB3xY9z`) rather than an app route. Locale codes and reserved
 * names are excluded so static app routes keep priority over the redirect.
 */
export function isShortLinkPath(pathname: string): boolean {
  if (!SLUG_PATTERN.test(pathname)) return false;

  const slug = pathname.slice(1);
  if ((routing.locales as readonly string[]).includes(slug)) return false;
  if (isReservedSlug(slug)) return false;

  return true;
}
