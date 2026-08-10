import { detectBrandMismatch } from '@/lib/shortener/brand-mismatch';
import { normalizeSlug } from '@/lib/shortener/normalize-slug';
import { isReservedSlug } from '@/lib/shortener/reserved-slugs';
import { checkRetiredSlugConflict } from '@/lib/shortener/retired-slug';
import {
  checkSlugSimilarity,
  degarnish,
} from '@/lib/shortener/slug-similarity';
import { validateSlugFormat } from '@/lib/shortener/validate-slug-format';
import type { createServiceClient } from '@/lib/supabase/service';

type ServiceClient = ReturnType<typeof createServiceClient>;

export type CustomSlugValidationReason =
  | 'invalid-format'
  | 'reserved'
  | 'too-similar'
  | 'retired'
  | 'brand-mismatch';

export type CustomSlugValidation =
  | { valid: true; slug: string }
  | { valid: false; reason: CustomSlugValidationReason };

/**
 * The one function both POST /api/links and GET /api/links/availability call,
 * so their rules can never drift apart. Returns a category, never
 * slug-revealing detail: needed for differentiated inline messages while
 * still respecting "explain there's a near-duplicate without revealing
 * which one" and "never leak which slugs are taken."
 *
 * Deliberately does NOT check live uniqueness against `links` -- that's the
 * caller's job (POST relies on insert-and-catch-23505 for the real race;
 * the availability endpoint does its own read after this passes).
 */
export async function validateCustomSlugCandidate(
  service: ServiceClient,
  rawSlug: string,
  userId: string,
  destinationHost?: string,
): Promise<CustomSlugValidation> {
  const slug = normalizeSlug(rawSlug);

  const format = validateSlugFormat(slug);
  if (!format.valid) return { valid: false, reason: 'invalid-format' };

  if (isReservedSlug(slug)) return { valid: false, reason: 'reserved' };

  const similarity = await checkSlugSimilarity(service, degarnish(slug));
  if (similarity.tooSimilar) return { valid: false, reason: 'too-similar' };

  const retired = await checkRetiredSlugConflict(service, slug, userId);
  if (retired.blocked) return { valid: false, reason: 'retired' };

  if (destinationHost) {
    const brandCheck = detectBrandMismatch(degarnish(slug), destinationHost);
    if (brandCheck.suspicious)
      return { valid: false, reason: 'brand-mismatch' };
  }

  return { valid: true, slug };
}
