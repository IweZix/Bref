import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getTestServerUrl,
  startTestServer,
  stopTestServer,
} from './helpers/next-test-server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VISITOR_HASH_SECRET = process.env.VISITOR_HASH_SECRET;
const hasLocalStack = Boolean(
  SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY && VISITOR_HASH_SECRET,
);

const TARGET_URL = 'https://example.com/product?utm_source=newsletter';

/**
 * Spec test 4: `s=qr` (and anything else on the incoming short-link request)
 * must never leak into the final redirect destination, while destination
 * params that were already part of the stored target_url are preserved.
 * The redirect route never forwards any incoming query string to
 * target_url at all -- this is a regression guard on that existing
 * behavior, not new stripping logic.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)(
  'QR source param not leaked to destination',
  () => {
    let slug: string;

    beforeAll(async () => {
      await startTestServer(3105, {
        NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL as string,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY as string,
        SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY as string,
        VISITOR_HASH_SECRET: VISITOR_HASH_SECRET as string,
      });

      const anon = createClient(SUPABASE_URL as string, ANON_KEY as string);
      const { data: session } = await anon.auth.signInAnonymously();
      if (!session.user)
        throw new Error('Failed to create anonymous user for test setup');

      slug = `qr-leak-test-${crypto.randomUUID().slice(0, 8)}`;
      const { error } = await anon.from('links').insert({
        slug,
        target_url: TARGET_URL,
        user_id: session.user.id,
      });
      if (error) throw new Error(`Setup insert failed: ${error.message}`);
    }, 40_000);

    afterAll(() => {
      stopTestServer();
    });

    it('redirects to exactly target_url, dropping s=qr and any other incoming param', async () => {
      const response = await fetch(
        `${getTestServerUrl()}/${slug}?s=qr&extra=1`,
        { redirect: 'manual' },
      );
      const location = response.headers.get('location');
      expect(location).toBe(TARGET_URL);
      expect(location).not.toContain('s=qr');
      expect(location).not.toContain('extra=1');
    });

    it("preserves the destination's own pre-existing query string", async () => {
      const response = await fetch(`${getTestServerUrl()}/${slug}?s=qr`, {
        redirect: 'manual',
      });
      expect(response.headers.get('location')).toContain(
        'utm_source=newsletter',
      );
    });
  },
);
