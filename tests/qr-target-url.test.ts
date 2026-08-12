import { describe, expect, it } from 'vitest';
import { buildQrTargetUrl } from '@/lib/shortener/qr-options';

// Spec test 1: the QR must encode the short URL with the source marker
// appended, and nothing else altered.
describe('buildQrTargetUrl', () => {
  it('appends the qr source marker to the short URL', () => {
    expect(buildQrTargetUrl('https://blip.link/moncv')).toBe(
      'https://blip.link/moncv?s=qr',
    );
  });

  it('preserves an existing query string on the short URL', () => {
    expect(buildQrTargetUrl('https://blip.link/moncv?foo=bar')).toBe(
      'https://blip.link/moncv?foo=bar&s=qr',
    );
  });

  it('overwrites rather than duplicates an existing s param', () => {
    expect(buildQrTargetUrl('https://blip.link/moncv?s=web')).toBe(
      'https://blip.link/moncv?s=qr',
    );
  });
});
