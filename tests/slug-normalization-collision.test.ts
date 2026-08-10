import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY);

/**
 * Spec test 1: uniqueness is case/Unicode-form insensitive — "MonCV" and
 * "moncv" must never both exist, since a visitor perceives them as the same
 * link. Enforced by the `slug_normalized` generated column's unique index,
 * not by application code, so this hits the database directly.
 *
 * Requires the local Supabase stack: `npx supabase start`, then
 * `npx supabase status -o env` to populate .env.test.local.
 */
describe.skipIf(!hasLocalStack)('slug normalization collision', () => {
  const url = SUPABASE_URL as string;
  const anonKey = ANON_KEY as string;

  it('rejects a second slug that only differs in case', async () => {
    const anon = createClient(url, anonKey);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');

    const base = `Collision-Test-${crypto.randomUUID().slice(0, 8)}`;
    const { error: firstError } = await anon.from('links').insert({
      slug: base,
      target_url: 'https://example.com/first',
      user_id: session.user.id,
      is_custom_slug: true,
    });
    expect(firstError).toBeNull();

    const { error: secondError } = await anon.from('links').insert({
      slug: base.toLowerCase(),
      target_url: 'https://example.com/second',
      user_id: session.user.id,
      is_custom_slug: true,
    });
    expect(secondError).not.toBeNull();
    expect(secondError?.code).toBe('23505');
  });

  it('allows two slugs that are genuinely different once normalized', async () => {
    const anon = createClient(url, anonKey);
    const { data: session } = await anon.auth.signInAnonymously();
    if (!session.user) throw new Error('Failed to create anonymous session');

    const suffix = crypto.randomUUID().slice(0, 8);
    const { error: firstError } = await anon.from('links').insert({
      slug: `distinct-a-${suffix}`,
      target_url: 'https://example.com/a',
      user_id: session.user.id,
      is_custom_slug: true,
    });
    expect(firstError).toBeNull();

    const { error: secondError } = await anon.from('links').insert({
      slug: `distinct-b-${suffix}`,
      target_url: 'https://example.com/b',
      user_id: session.user.id,
      is_custom_slug: true,
    });
    expect(secondError).toBeNull();
  });
});
