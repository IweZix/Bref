export type SlugFormatValidation =
  | { valid: true }
  | {
      valid: false;
      reason:
        | 'too-short'
        | 'too-long'
        | 'invalid-characters'
        | 'edge-hyphen'
        | 'consecutive-hyphens'
        | 'all-digits';
    };

/**
 * Operates on an already-normalized slug (see normalize-slug.ts). Lowercase
 * ASCII, digits, hyphen and underscore only -- Unicode and homoglyphs are
 * rejected outright rather than silently transformed, since a lookalike
 * character in a shortener slug is exactly how you get a `paypaI.link`.
 */
export function validateSlugFormat(normalized: string): SlugFormatValidation {
  if (normalized.length < 3) return { valid: false, reason: 'too-short' };
  if (normalized.length > 32) return { valid: false, reason: 'too-long' };
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return { valid: false, reason: 'invalid-characters' };
  }
  if (normalized.startsWith('-') || normalized.endsWith('-')) {
    return { valid: false, reason: 'edge-hyphen' };
  }
  if (normalized.includes('--')) {
    return { valid: false, reason: 'consecutive-hyphens' };
  }
  if (/^[0-9]+$/.test(normalized)) {
    return { valid: false, reason: 'all-digits' };
  }
  return { valid: true };
}
