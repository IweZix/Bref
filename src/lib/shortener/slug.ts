// Excludes ambiguous characters (0/O, 1/l/I) so slugs are easy to read and retype.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SLUG_LENGTH = 7;

/**
 * CSPRNG-backed, not Math.random() — a guessable slug generator would let
 * anyone enumerate other people's links.
 */
export function generateSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);

  let slug = '';
  for (const byte of bytes) {
    slug += ALPHABET[byte % ALPHABET.length];
  }
  return slug;
}
