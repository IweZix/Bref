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

/**
 * Spec test 6: a retired custom slug must resolve to a genuine HTTP 410, not
 * the 307-to-not-found path used for a slug that never existed — the two
 * failure modes are semantically different (this one existed and won't come
 * back to anyone else) and the UI on the other end needs to tell them apart.
 *
 * Note: this only exercises the read path (resolveSlug -> retired_slugs).
 * The full authenticated DELETE -> revalidateTag -> immediate-fresh-read
 * flow requires a real cookie session, which — same as
 * tests/cache-invalidation.test.ts's own precedent — isn't reproducible
 * outside a browser within this Vitest-only test architecture, and was
 * verified manually instead.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('retired slug status code', () => {
  const url = SUPABASE_URL as string;
  const service = createClient(url, SERVICE_ROLE_KEY as string);

  beforeAll(async () => {
    await startTestServer(3102, {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL as string,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY as string,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY as string,
      VISITOR_HASH_SECRET: VISITOR_HASH_SECRET as string,
    });
  }, 40_000);

  afterAll(() => {
    stopTestServer();
  });

  it('responds with 410 for a retired slug, not 404 or a redirect', async () => {
    const anon = createClient(url, ANON_KEY as string);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');

    const slug = `retired-status-test-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await service.from('retired_slugs').insert({
      slug,
      retired_by: session.user.id,
    });
    if (error) throw new Error(`Setup insert failed: ${error.message}`);

    const response = await fetch(`${getTestServerUrl()}/${slug}`, {
      redirect: 'manual',
    });
    expect(response.status).toBe(410);
    expect(response.headers.get('location')).toBeNull();
  });

  it('still uses the 307-to-not-found path for a slug that was never claimed', async () => {
    const response = await fetch(
      `${getTestServerUrl()}/never-claimed-${Date.now()}`,
      { redirect: 'manual' },
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/link-not-found');
  });
});
