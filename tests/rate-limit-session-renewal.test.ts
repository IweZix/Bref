import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '@/lib/shortener/rate-limit';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RATE_LIMIT_HASH_SECRET = process.env.RATE_LIMIT_HASH_SECRET;
const hasLocalStack = Boolean(
  SUPABASE_URL && SERVICE_ROLE_KEY && RATE_LIMIT_HASH_SECRET,
);

/**
 * Spec test 7: rate limiting must survive session renewal. A session-only
 * limit is trivially bypassed by opening a fresh anonymous session — the
 * shared IP-hash bucket is what makes that not work.
 */
describe.skipIf(!hasLocalStack)('rate limit survives session renewal', () => {
  it('a fresh session from the same IP is still blocked once the IP bucket is exhausted', async () => {
    const sharedIpHash = `test-ip-${crypto.randomUUID()}`;
    const sessionA = `test-session-a-${crypto.randomUUID()}`;

    let lastResult: Awaited<ReturnType<typeof checkRateLimit>> | undefined;
    for (let i = 0; i < 21; i++) {
      lastResult = await checkRateLimit({
        sessionId: sessionA,
        ipHash: sharedIpHash,
      });
    }
    expect(lastResult?.allowed).toBe(false);

    // Session A is now blocked as expected — the real test is whether a
    // brand new session (never seen before, own clean session-bucket) on the
    // SAME network is also blocked, because the IP bucket is shared.
    const sessionB = `test-session-b-${crypto.randomUUID()}`;
    const resultForFreshSession = await checkRateLimit({
      sessionId: sessionB,
      ipHash: sharedIpHash,
    });
    expect(resultForFreshSession.allowed).toBe(false);
  });

  it('a different session from a different IP is not affected', async () => {
    const result = await checkRateLimit({
      sessionId: `test-session-unrelated-${crypto.randomUUID()}`,
      ipHash: `test-ip-unrelated-${crypto.randomUUID()}`,
    });
    expect(result.allowed).toBe(true);
  });
});
