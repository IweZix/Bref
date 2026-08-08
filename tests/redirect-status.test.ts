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
// Service role key isn't used to write fixtures (it has no INSERT grant on
// links — only `authenticated` does, matching how the app itself creates
// links) but IS required by the spawned server for the redirect route itself.
const hasLocalStack = Boolean(
  SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY && VISITOR_HASH_SECRET,
);

const TARGET_URL = 'https://example.com/redirect-target';

/**
 * Spec test 1: the redirect status must be 307, never 301/308. A browser that
 * caches a permanent redirect stops sending repeat visits to the server at
 * all — clicks silently disappear and destination changes stop taking effect.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts) — spawns
 * a real `next dev` on a dedicated port against it, so this is a genuine
 * end-to-end check of src/proxy.ts's rewrite + the route handler.
 */
describe.skipIf(!hasLocalStack)('redirect status code', () => {
  let slug: string;

  beforeAll(async () => {
    await startTestServer(3100, {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL as string,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY as string,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY as string,
      VISITOR_HASH_SECRET: VISITOR_HASH_SECRET as string,
    });

    // Insert as the owning anonymous session itself (RLS-respecting), exactly
    // like the real /api/links route does — not via the service role, which
    // deliberately has no INSERT grant on links.
    const anon = createClient(SUPABASE_URL as string, ANON_KEY as string);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user)
      throw new Error('Failed to create anonymous user for test setup');

    slug = `redirect-test-${crypto.randomUUID().slice(0, 8)}`;
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

  it('responds with 307 and the correct Location for an active link', async () => {
    const response = await fetch(`${getTestServerUrl()}/${slug}`, {
      redirect: 'manual',
    });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(TARGET_URL);
  });

  it('never responds with 301 or 308', async () => {
    const response = await fetch(`${getTestServerUrl()}/${slug}`, {
      redirect: 'manual',
    });
    expect(response.status).not.toBe(301);
    expect(response.status).not.toBe(308);
  });

  it('redirects an unknown slug to the not-found page instead of erroring', async () => {
    const response = await fetch(
      `${getTestServerUrl()}/does-not-exist-${Date.now()}`,
      {
        redirect: 'manual',
      },
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/link-not-found');
  });
});
