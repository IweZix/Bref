import { requireEnv } from '@/lib/env';

/**
 * Deliberately stable — never rotates, unlike visitor-hash.ts's daily-rotating
 * salt. A rotating rate-limit key would silently reset everyone's limit every
 * day. Uses its own secret so this hash is never derivable from the click
 * privacy hash, or vice versa.
 */
export async function hashIp(ip: string): Promise<string> {
  const secret = requireEnv(
    process.env.RATE_LIMIT_HASH_SECRET,
    'RATE_LIMIT_HASH_SECRET',
  );

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(ip));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
