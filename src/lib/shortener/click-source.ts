export type ClickSource = 'web' | 'qr';

/**
 * Strictly whitelisted: `s` is visitor-supplied on the incoming request, so
 * anything other than the one recognized value falls back to 'web' rather
 * than being written verbatim to the database.
 */
export function parseClickSource(raw: string | null): ClickSource {
  return raw === 'qr' ? 'qr' : 'web';
}
