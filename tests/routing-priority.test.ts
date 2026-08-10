import { describe, expect, it } from 'vitest';
import { isShortLinkPath } from '@/lib/shortener/is-short-link-path';

// Spec test 3 (routing half — the reserved-slug half lives in tests/reserved-slugs.test.ts):
// app static routes and locale codes must never be captured by the short-link rewrite.
describe('isShortLinkPath (routing priority)', () => {
  it('does not treat reserved app routes as short links', () => {
    expect(isShortLinkPath('/about')).toBe(false);
    expect(isShortLinkPath('/dashboard')).toBe(false);
    expect(isShortLinkPath('/api')).toBe(false);
  });

  it('does not treat locale codes as short links', () => {
    expect(isShortLinkPath('/fr')).toBe(false);
    expect(isShortLinkPath('/en')).toBe(false);
  });

  it('does not treat multi-segment paths as short links', () => {
    expect(isShortLinkPath('/fr/about')).toBe(false);
    expect(isShortLinkPath('/dashboard/settings')).toBe(false);
  });

  it('treats an ordinary generated slug as a short link', () => {
    expect(isShortLinkPath('/aB3xY9z')).toBe(true);
  });

  it('treats a custom slug as a short link', () => {
    expect(isShortLinkPath('/promo-hiver')).toBe(true);
  });

  it('treats a custom slug containing an underscore as a short link', () => {
    expect(isShortLinkPath('/mon_cv')).toBe(true);
  });
});
