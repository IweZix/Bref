/**
 * Canonical form used for uniqueness and resolution, mirrored in SQL by the
 * `slug_normalized` generated column (`lower(normalize(slug, nfkc))`). This is
 * the one function creation, availability-check, and redirect resolution all
 * call, so a slug typed under a different Unicode form or case always
 * resolves to the same row and can never be squatted twice under a
 * lookalike form.
 */
export function normalizeSlug(rawSlug: string): string {
  return rawSlug.trim().normalize('NFKC').toLowerCase();
}
