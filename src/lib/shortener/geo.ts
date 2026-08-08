/**
 * Vercel's edge network sets this header with a 2-letter country code.
 * `request.geo` was removed from the Next.js/Vercel runtime — the header is
 * the current supported way to read it. Returns null outside Vercel (e.g. local dev).
 */
export function getCountry(request: Request): string | null {
  return request.headers.get('x-vercel-ip-country');
}

/** Best-effort client IP for the (daily-rotating, hashed) visitor fingerprint — never stored raw. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? '0.0.0.0';
}
