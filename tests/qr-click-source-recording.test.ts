import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseClickSource } from '@/lib/shortener/click-source';
import {
  getTestServerUrl,
  startTestServer,
  stopTestServer,
} from './helpers/next-test-server';

// Spec test 2 (unit half): arbitrary/unrecognized values must fall back to
// 'web', never be written verbatim -- `s` is visitor-supplied.
describe('parseClickSource', () => {
  it('recognizes qr', () => {
    expect(parseClickSource('qr')).toBe('qr');
  });

  it('falls back to web for null, empty, or an arbitrary value', () => {
    expect(parseClickSource(null)).toBe('web');
    expect(parseClickSource('')).toBe('web');
    expect(parseClickSource('email')).toBe('web');
    expect(parseClickSource("'; drop table clicks; --")).toBe('web');
  });
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VISITOR_HASH_SECRET = process.env.VISITOR_HASH_SECRET;
const hasLocalStack = Boolean(
  SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY && VISITOR_HASH_SECRET,
);

/**
 * Spec test 2 (HTTP half): a visit with ?s=qr must record source: 'qr',
 * including through the interstitial round-trip -- the bug fixed in
 * src/app/api/r/[slug]/route.ts and src/app/[locale]/interstitial/page.tsx,
 * where the marker would otherwise be silently dropped between the two
 * redirects.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)('QR click source recording', () => {
  const url = SUPABASE_URL as string;
  const anon = createClient(url, ANON_KEY as string);
  const service = createClient(url, SERVICE_ROLE_KEY as string);

  let userId: string;

  beforeAll(async () => {
    await startTestServer(3103, {
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

  async function latestClickSource(linkId: string): Promise<string | null> {
    const { data } = await service
      .from('clicks')
      .select('source')
      .eq('link_id', linkId)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.source ?? null;
  }

  it('records source: web for a plain visit', async () => {
    const slug = `qr-web-${crypto.randomUUID().slice(0, 8)}`;
    const { data: link } = await anon
      .from('links')
      .insert({
        slug,
        target_url: 'https://example.com/qr-web',
        user_id: userId,
      })
      .select()
      .single();
    if (!link) throw new Error('Setup insert failed');

    await fetch(`${getTestServerUrl()}/${slug}`, { redirect: 'manual' });
    await new Promise((resolve) => setTimeout(resolve, 500)); // after() completes post-response

    expect(await latestClickSource(link.id)).toBe('web');
  });

  it('records source: qr for a ?s=qr visit', async () => {
    const slug = `qr-scan-${crypto.randomUUID().slice(0, 8)}`;
    const { data: link } = await anon
      .from('links')
      .insert({
        slug,
        target_url: 'https://example.com/qr-scan',
        user_id: userId,
      })
      .select()
      .single();
    if (!link) throw new Error('Setup insert failed');

    await fetch(`${getTestServerUrl()}/${slug}?s=qr`, { redirect: 'manual' });
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(await latestClickSource(link.id)).toBe('qr');
  });

  it('records source: qr through the interstitial round-trip', async () => {
    const slug = `qr-interstitial-${crypto.randomUUID().slice(0, 8)}`;
    const { data: link } = await anon
      .from('links')
      .insert({
        slug,
        target_url: 'https://example.com/qr-interstitial',
        user_id: userId,
        requires_interstitial: true,
      })
      .select()
      .single();
    if (!link) throw new Error('Setup insert failed');

    // First hop: scanning the QR should redirect to the interstitial with
    // the source marker carried along.
    const firstHop = await fetch(`${getTestServerUrl()}/${slug}?s=qr`, {
      redirect: 'manual',
    });
    expect(firstHop.status).toBe(307);
    const interstitialLocation = firstHop.headers.get('location') ?? '';
    expect(interstitialLocation).toContain('s=qr');

    // The interstitial page's own "Continuer" link must also carry it --
    // check both fragments independently rather than an exact adjacent
    // string, since HTML attribute serialization may entity-escape `&`.
    const interstitialPage = await fetch(interstitialLocation);
    const html = await interstitialPage.text();
    expect(html).toContain(`/api/r/${slug}?skip_interstitial=1`);
    expect(html).toMatch(/s=qr/);

    // Following that exact continue link is what a real click would do.
    await fetch(
      `${getTestServerUrl()}/api/r/${slug}?skip_interstitial=1&s=qr`,
      { redirect: 'manual' },
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(await latestClickSource(link.id)).toBe('qr');
  });
});
