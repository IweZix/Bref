import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
 * Spec test 3: the resolution cache must never be segmented by the `s`
 * param -- a request with ?s=qr and a plain request must share the exact
 * same cache entry, or a popular QR-driven link would silently double the
 * number of cache entries (and DB reads) for no benefit. Same technique as
 * tests/cache-invalidation.test.ts: update the DB directly (bypassing
 * revalidateTag) and confirm BOTH request shapes keep serving the stale
 * cached value -- proving they hit the same cache key, not two different
 * ones with independent lifetimes.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('QR param does not segment the cache', () => {
  let slug: string;
  let anon: SupabaseClient;

  beforeAll(async () => {
    await startTestServer(3104, {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL as string,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY as string,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY as string,
      VISITOR_HASH_SECRET: VISITOR_HASH_SECRET as string,
    });

    anon = createClient(SUPABASE_URL as string, ANON_KEY as string);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user)
      throw new Error('Failed to create anonymous user for test setup');

    slug = `qr-cache-test-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await anon.from('links').insert({
      slug,
      target_url: 'https://example.com/qr-cache-original',
      user_id: session.user.id,
    });
    if (error) throw new Error(`Setup insert failed: ${error.message}`);
  }, 40_000);

  afterAll(() => {
    stopTestServer();
  });

  it('a plain request and a ?s=qr request resolve to the same destination', async () => {
    const plain = await fetch(`${getTestServerUrl()}/${slug}`, {
      redirect: 'manual',
    });
    const withSource = await fetch(`${getTestServerUrl()}/${slug}?s=qr`, {
      redirect: 'manual',
    });
    expect(plain.headers.get('location')).toBe(
      withSource.headers.get('location'),
    );
  });

  it('updating the DB directly leaves BOTH request shapes serving the stale cached value', async () => {
    await anon
      .from('links')
      .update({ target_url: 'https://example.com/qr-cache-updated' })
      .eq('slug', slug);

    const plain = await fetch(`${getTestServerUrl()}/${slug}`, {
      redirect: 'manual',
    });
    const withSource = await fetch(`${getTestServerUrl()}/${slug}?s=qr`, {
      redirect: 'manual',
    });

    expect(plain.headers.get('location')).toBe(
      'https://example.com/qr-cache-original',
    );
    expect(withSource.headers.get('location')).toBe(
      'https://example.com/qr-cache-original',
    );
  });
});
