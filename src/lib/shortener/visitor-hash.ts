import { requireEnv } from '@/lib/env';

/**
 * Rotates daily so it's non-correlable day-to-day, and is scoped per-link so
 * it's non-correlable across two different links either. This is deliberately
 * NOT the same secret/derivation as the rate-limit IP hash (src/lib/shortener/ip-hash.ts,
 * ticket 12) — that one must stay stable, or the rate limit would reset every day.
 */
export async function hashVisitor(
  ip: string,
  userAgent: string,
  linkId: string,
): Promise<string> {
  const secret = requireEnv(
    process.env.VISITOR_HASH_SECRET,
    'VISITOR_HASH_SECRET',
  );
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${today}|${ip}|${userAgent}|${linkId}`),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
