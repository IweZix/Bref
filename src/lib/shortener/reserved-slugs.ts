export const RESERVED_SLUGS = new Set([
  // App routes, existing and plausible future ones
  'api',
  'dashboard',
  'about',
  'l',
  '_next',
  'favicon.ico',
  'fr',
  'en',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'well-known',
  'admin',
  'static',
  'assets',
  'link-not-found',
  'interstitial',
  'report',
  'pricing',
  'help',
  'status',
  'settings',

  // Frequently-impersonated brands and services
  'google',
  'apple',
  'microsoft',
  'amazon',
  'facebook',
  'instagram',
  'paypal',
  'netflix',
  'twitter',
  'x',
  'stripe',
  'revolut',
  'whatsapp',
  'bpost',
  'itsme',

  // Financial / authentication terms -- high-value phishing bait regardless
  // of any specific brand
  'login',
  'signin',
  'signup',
  'logout',
  'password',
  'verify',
  'verification',
  'secure',
  'security',
  'account',
  'wallet',
  'bank',
  'banque',
  'paiement',
  'payment',
  'invoice',
  'facture',

  // Note: no offensive/profanity list is maintained here. A real one needs a
  // proper moderation wordlist (with locale coverage and false-positive
  // tuning) rather than a handful of hardcoded terms, which would give a
  // false sense of coverage. Flagged as a deliberate scope cut, same as the
  // i18n gap documented in CLAUDE.md -- worth a dedicated pass if abuse
  // volume ever justifies it.
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
