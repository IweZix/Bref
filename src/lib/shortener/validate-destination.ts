const MAX_URL_LENGTH = 2048;

export type ValidateDestinationResult =
  | { valid: true; url: string }
  | { valid: false; reason: string };

/**
 * A shortener is a machine for hiding destinations, so this is the one thing
 * it must never get wrong. `ownHost`, when given, blocks a link from pointing
 * back at this service itself (a redirect loop).
 */
export function validateDestinationUrl(
  rawUrl: string,
  ownHost?: string,
): ValidateDestinationResult {
  if (!rawUrl || rawUrl.length > MAX_URL_LENGTH) {
    return { valid: false, reason: 'URL is missing or too long' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Not a valid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only http and https URLs are allowed' };
  }

  if (ownHost && parsed.host.toLowerCase() === ownHost.toLowerCase()) {
    return { valid: false, reason: 'URL cannot point back to this service' };
  }

  return { valid: true, url: parsed.toString() };
}
