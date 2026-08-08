/**
 * Host only, never the full referrer — a complete referrer URL can leak
 * session tokens or search terms. `github.com` is enough for analytics.
 */
export function getReferrerHost(request: Request): string | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;

  try {
    return new URL(referer).hostname;
  } catch {
    return null;
  }
}
