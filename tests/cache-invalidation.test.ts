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
 * Ticket 9: `resolveSlug` must actually cache (not just always hit the DB) —
 * `unstable_cache` requires a live Next.js request context, so this runs
 * against a real spawned server, same as the redirect tests.
 *
 * This proves the cache is genuinely active (the exact failure mode the spec
 * warns about for a module-level Map: it either doesn't cache at all, or
 * caches per-instance in a way that never gets invalidated). The full
 * PATCH -> revalidateTag -> immediate-fresh-read flow requires an
 * authenticated cookie session, which isn't reproducible outside a real
 * browser without reaching for Playwright (out of scope per the "Vitest
 * only" test architecture) — verified manually instead, per the plan.
 */
describe.skipIf(!hasLocalStack)('resolveSlug caching', () => {
  let slug: string;
  let anon: ReturnType<typeof createClient>;

  beforeAll(async () => {
    await startTestServer(3101, {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL as string,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY as string,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY as string,
      VISITOR_HASH_SECRET: VISITOR_HASH_SECRET as string,
    });

    anon = createClient(SUPABASE_URL as string, ANON_KEY as string);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user)
      throw new Error('Failed to create anonymous user for test setup');

    slug = `cache-test-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await anon.from('links').insert({
      slug,
      target_url: 'https://example.com/original',
      user_id: session.user.id,
    });
    if (error) throw new Error(`Setup insert failed: ${error.message}`);
  }, 40_000);

  afterAll(() => {
    stopTestServer();
  });

  it('resolves the current destination on first visit', async () => {
    const response = await fetch(`${getTestServerUrl()}/${slug}`, {
      redirect: 'manual',
    });
    expect(response.headers.get('location')).toBe(
      'https://example.com/original',
    );
  });

  it('keeps serving the cached destination when the DB changes without going through revalidateTag', async () => {
    await anon
      .from('links')
      .update({ target_url: 'https://example.com/updated' })
      .eq('slug', slug);

    const response = await fetch(`${getTestServerUrl()}/${slug}`, {
      redirect: 'manual',
    });
    expect(response.headers.get('location')).toBe(
      'https://example.com/original',
    );
  });
});
