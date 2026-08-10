import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  checkSlugSimilarity,
  degarnish,
} from '@/lib/shortener/slug-similarity';

// Spec test 3 (unit half): degarnishing folds separators and the classic
// homograph digits, so near-duplicate slugs collide before ever reaching
// the database check.
describe('degarnish', () => {
  it('strips hyphens and underscores', () => {
    expect(degarnish('mon-cv')).toBe('moncv');
    expect(degarnish('mon_cv')).toBe('moncv');
  });

  it('folds confusable digits to the letters they mimic', () => {
    expect(degarnish('paypa1')).toBe('paypal');
    expect(degarnish('g00gle')).toBe('google');
    expect(degarnish('5ecure')).toBe('secure');
  });

  it('produces the same result for a slug and its confusable variant', () => {
    expect(degarnish('paypa1-secure')).toBe(degarnish('paypalsecure'));
    expect(degarnish('mon-cv')).toBe(degarnish('moncv'));
  });
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

// Spec test 3 (DB half): a slug already taken (e.g. "paypal") blocks a
// near-duplicate variant (e.g. "paypa1") via the degarnished_slug column.
describe.skipIf(!hasLocalStack)('checkSlugSimilarity', () => {
  const url = SUPABASE_URL as string;
  const service = createClient(url, SERVICE_ROLE_KEY as string);

  let existingSlug: string;

  beforeAll(async () => {
    const anon = createClient(url, ANON_KEY as string);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');

    existingSlug = `similarity-test-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await anon.from('links').insert({
      slug: existingSlug,
      target_url: 'https://example.com/similarity',
      user_id: session.user.id,
      is_custom_slug: true,
    });
    if (error) throw new Error(`Setup insert failed: ${error.message}`);
  });

  it('flags a near-duplicate of an existing slug as too similar', async () => {
    // Same slug with hyphens swapped for underscores -- a different literal
    // string, but degarnishes identically since both separators are stripped.
    const variant = existingSlug.replace(/-/g, '_');
    const result = await checkSlugSimilarity(service, degarnish(variant));
    expect(result.tooSimilar).toBe(true);
  });

  it('does not flag an unrelated slug', async () => {
    const unrelated = `unrelated-${crypto.randomUUID().slice(0, 8)}`;
    const result = await checkSlugSimilarity(service, degarnish(unrelated));
    expect(result.tooSimilar).toBe(false);
  });
});
