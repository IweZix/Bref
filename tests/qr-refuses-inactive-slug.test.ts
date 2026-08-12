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
 * Spec test 7: /api/qr/[slug] must refuse (never serve a dead QR) for a
 * slug that doesn't exist, is disabled, has expired, or was retired --
 * a QR printed for a link that's already gone is worse than no QR at all.
 * Uses resolveSlug's existing three-state result, so this doubles as a
 * regression check on the shared resolution path.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('QR PNG route refuses inactive slugs', () => {
  const url = SUPABASE_URL as string;
  const anon = createClient(url, ANON_KEY as string);
  const service = createClient(url, SERVICE_ROLE_KEY as string);

  let userId: string;

  beforeAll(async () => {
    await startTestServer(3106, {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ANON_KEY as string,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY as string,
      VISITOR_HASH_SECRET: VISITOR_HASH_SECRET as string,
    });

    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');
    userId = session.user.id;
  }, 40_000);

  afterAll(() => {
    stopTestServer();
  });

  async function fetchQr(slug: string) {
    return fetch(`${getTestServerUrl()}/api/qr/${slug}?size=screen`);
  }

  it('returns a real PNG for an active link', async () => {
    const slug = `qr-active-${crypto.randomUUID().slice(0, 8)}`;
    await anon.from('links').insert({
      slug,
      target_url: 'https://example.com/qr-active',
      user_id: userId,
    });

    const response = await fetchQr(slug);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
  });

  it('refuses a slug that was never claimed', async () => {
    const response = await fetchQr(`qr-nonexistent-${Date.now()}`);
    expect(response.status).toBe(404);
  });

  it('refuses a disabled link', async () => {
    const slug = `qr-disabled-${crypto.randomUUID().slice(0, 8)}`;
    await anon.from('links').insert({
      slug,
      target_url: 'https://example.com/qr-disabled',
      user_id: userId,
      is_active: false,
    });

    const response = await fetchQr(slug);
    expect(response.status).toBe(404);
  });

  it('refuses an expired link', async () => {
    const slug = `qr-expired-${crypto.randomUUID().slice(0, 8)}`;
    await anon.from('links').insert({
      slug,
      target_url: 'https://example.com/qr-expired',
      user_id: userId,
      expires_at: '2020-01-01T00:00:00Z',
    });

    const response = await fetchQr(slug);
    expect(response.status).toBe(404);
  });

  it('refuses a retired custom slug', async () => {
    const slug = `qr-retired-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await service.from('retired_slugs').insert({
      slug,
      retired_by: userId,
    });
    if (error) throw new Error(`Setup insert failed: ${error.message}`);

    const response = await fetchQr(slug);
    expect(response.status).toBe(404);
  });
});
