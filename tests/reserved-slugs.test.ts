import { describe, expect, it } from 'vitest';
import { isReservedSlug } from '@/lib/shortener/reserved-slugs';

// Spec test 3 (unit half — the routing half, confirming app pages aren't
// captured by the dynamic slug route, lands in ticket 6's routing test).
describe('isReservedSlug', () => {
  it('flags known reserved slugs', () => {
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('dashboard')).toBe(true);
    expect(isReservedSlug('about')).toBe(true);
    expect(isReservedSlug('fr')).toBe(true);
    expect(isReservedSlug('en')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isReservedSlug('API')).toBe(true);
    expect(isReservedSlug('Dashboard')).toBe(true);
  });

  it('does not flag ordinary slugs', () => {
    expect(isReservedSlug('aB3xY9z')).toBe(false);
    expect(isReservedSlug('promo-hiver')).toBe(false);
  });

  it('flags frequently-impersonated brands', () => {
    expect(isReservedSlug('paypal')).toBe(true);
    expect(isReservedSlug('google')).toBe(true);
    expect(isReservedSlug('bpost')).toBe(true);
  });

  it('flags financial and authentication terms', () => {
    expect(isReservedSlug('login')).toBe(true);
    expect(isReservedSlug('verify')).toBe(true);
    expect(isReservedSlug('payment')).toBe(true);
  });
});
