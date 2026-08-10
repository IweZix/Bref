import { describe, expect, it } from 'vitest';
import { checkCustomSlugRateLimit } from '@/lib/shortener/custom-slug-rate-limit';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

/**
 * Spec test 8: the custom-slug attempt limit is a separate budget from the
 * general creation-frequency limiter (tests/rate-limit-session-renewal.test.ts)
 * and, like it, must survive a fresh session on the same network — otherwise
 * squatting is one anonymous sign-in away from unlimited attempts.
 */
describe.skipIf(!hasLocalStack)(
  'custom slug rate limit survives session renewal',
  () => {
    it('a fresh session from the same IP is still blocked once the IP bucket is exhausted', async () => {
      const sharedIpHash = `custom-slug-test-ip-${crypto.randomUUID()}`;
      const sessionA = `custom-slug-test-session-a-${crypto.randomUUID()}`;

      let lastResult:
        | Awaited<ReturnType<typeof checkCustomSlugRateLimit>>
        | undefined;
      for (let i = 0; i < 11; i++) {
        lastResult = await checkCustomSlugRateLimit({
          sessionId: sessionA,
          ipHash: sharedIpHash,
        });
      }
      expect(lastResult?.allowed).toBe(false);

      const sessionB = `custom-slug-test-session-b-${crypto.randomUUID()}`;
      const resultForFreshSession = await checkCustomSlugRateLimit({
        sessionId: sessionB,
        ipHash: sharedIpHash,
      });
      expect(resultForFreshSession.allowed).toBe(false);
    });

    it('a different session from a different IP is not affected', async () => {
      const result = await checkCustomSlugRateLimit({
        sessionId: `custom-slug-test-session-unrelated-${crypto.randomUUID()}`,
        ipHash: `custom-slug-test-ip-unrelated-${crypto.randomUUID()}`,
      });
      expect(result.allowed).toBe(true);
    });
  },
);
