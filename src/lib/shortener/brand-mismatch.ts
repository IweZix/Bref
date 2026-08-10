const BRAND_HOST_ALLOWLIST: Record<string, string[]> = {
  paypal: ['paypal.com'],
  apple: ['apple.com', 'icloud.com'],
  google: ['google.com', 'gmail.com'],
  microsoft: ['microsoft.com', 'live.com', 'office.com'],
  amazon: ['amazon.com'],
  netflix: ['netflix.com'],
  stripe: ['stripe.com'],
  revolut: ['revolut.com'],
  whatsapp: ['whatsapp.com'],
  bpost: ['bpost.be'],
  itsme: ['itsme.be', 'itsme-id.com'],
};

export type BrandMismatchResult =
  | { suspicious: false }
  | { suspicious: true; matchedBrand: string };

/**
 * A custom slug containing a brand token whose destination doesn't belong to
 * that brand's real domain is a textbook impersonation pattern
 * ("paypal-verify" -> some unrelated host). Only ever called for custom
 * slugs -- random slugs have no human-chosen text to compare against.
 */
export function detectBrandMismatch(
  degarnishedSlug: string,
  destinationHost: string,
): BrandMismatchResult {
  const host = destinationHost.toLowerCase();

  for (const [brand, allowedHosts] of Object.entries(BRAND_HOST_ALLOWLIST)) {
    if (!degarnishedSlug.includes(brand)) continue;
    const hostOk = allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
    if (!hostOk) return { suspicious: true, matchedBrand: brand };
  }

  return { suspicious: false };
}
