import { describe, expect, it } from 'vitest';
import {
  getQrRenderOptions,
  QR_DARK_COLOR,
  QR_LIGHT_COLOR,
  QR_MARGIN,
} from '@/lib/shortener/qr-options';

// Spec test 5: the QR's contrast must never invert with the app's dark mode
// -- getQrRenderOptions() is the single source of truth both the client SVG
// preview and the server PNG route consume, and it takes zero parameters,
// so there is no colorMode/theme value it could possibly read.
describe('QR render options — fixed contrast', () => {
  it('always returns the same hardcoded dark/light colors', () => {
    const options = getQrRenderOptions();
    expect(options.color).toEqual({ dark: '#000000', light: '#ffffff' });
    expect(QR_DARK_COLOR).toBe('#000000');
    expect(QR_LIGHT_COLOR).toBe('#ffffff');
  });

  it('getQrRenderOptions takes no parameters that could vary the result', () => {
    expect(getQrRenderOptions.length).toBe(0);
  });
});

// Spec test 6: a non-zero quiet zone must survive raw SVG export.
describe('QR render options — quiet zone', () => {
  it('sets a non-zero margin', () => {
    expect(QR_MARGIN).toBeGreaterThan(0);
    expect(getQrRenderOptions().margin).toBe(QR_MARGIN);
  });
});
