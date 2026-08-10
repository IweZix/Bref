import { describe, expect, it } from 'vitest';
import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import { validateSlugFormat } from '@/lib/shortener/validate-slug-format';

// Spec test 2 (format half -- the homoglyph/Unicode half lives in
// tests/slug-similarity.test.ts): the allowed alphabet is ASCII lowercase,
// digits, hyphen and underscore only, 3-32 chars, no edge/consecutive
// hyphens, not all-digit.
describe('validateSlugFormat', () => {
  it('accepts a well-formed slug', () => {
    expect(validateSlugFormat('promo-hiver')).toEqual({ valid: true });
    expect(validateSlugFormat('mon_cv')).toEqual({ valid: true });
    expect(validateSlugFormat('abc')).toEqual({ valid: true });
  });

  it('rejects slugs shorter than 3 characters', () => {
    expect(validateSlugFormat('ab')).toEqual({
      valid: false,
      reason: 'too-short',
    });
  });

  it('rejects slugs longer than 32 characters', () => {
    expect(validateSlugFormat('a'.repeat(33))).toEqual({
      valid: false,
      reason: 'too-long',
    });
    expect(validateSlugFormat('a'.repeat(32))).toEqual({ valid: true });
  });

  it('rejects characters outside the allowed alphabet', () => {
    expect(validateSlugFormat('mon.cv')).toEqual({
      valid: false,
      reason: 'invalid-characters',
    });
    expect(validateSlugFormat('café')).toEqual({
      valid: false,
      reason: 'invalid-characters',
    });
    expect(validateSlugFormat('MonCV')).toEqual({
      valid: false,
      reason: 'invalid-characters',
    });
  });

  it('rejects a leading or trailing hyphen', () => {
    expect(validateSlugFormat('-moncv')).toEqual({
      valid: false,
      reason: 'edge-hyphen',
    });
    expect(validateSlugFormat('moncv-')).toEqual({
      valid: false,
      reason: 'edge-hyphen',
    });
  });

  it('rejects consecutive hyphens', () => {
    expect(validateSlugFormat('mon--cv')).toEqual({
      valid: false,
      reason: 'consecutive-hyphens',
    });
  });

  it('rejects a slug composed only of digits', () => {
    expect(validateSlugFormat('12345')).toEqual({
      valid: false,
      reason: 'all-digits',
    });
  });
});

describe('normalizeSlug', () => {
  it('lowercases and trims', () => {
    expect(normalizeSlug('  MonCV  ')).toBe('moncv');
  });

  it('applies NFKC normalization', () => {
    // Fullwidth "Ａ" (U+FF21) NFKC-normalizes to ASCII "a".
    expect(normalizeSlug('Ａbc')).toBe('abc');
  });
});
