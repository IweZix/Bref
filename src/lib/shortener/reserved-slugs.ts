export const RESERVED_SLUGS = new Set([
  'api',
  'dashboard',
  'about',
  'l',
  '_next',
  'favicon.ico',
  'fr',
  'en',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'well-known',
  'admin',
  'static',
  'assets',
  'link-not-found',
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
