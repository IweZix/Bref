import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  checkRetiredSlugConflict,
  retireSlug,
} from '@/lib/shortener/retired-slug';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is not set — run \`npx supabase start\` and populate .env.test.local`,
    );
  }
  return value;
}

/**
 * Spec test 5: a deleted custom slug must never be re-claimable by anyone
 * other than the session that retired it — the failure mode this guards
 * against is a stranger inheriting the residual real-world traffic of a
 * slug someone else already shared widely (posters, emails, etc.) before
 * deleting it.
 *
 * Requires the local Supabase stack: `npx supabase start`, then
 * `npx supabase status -o env` to populate .env.test.local.
 */
describe.skipIf(!hasLocalStack)('retired slug non-reuse', () => {
  const url = requireEnv(SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv(ANON_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = requireEnv(
    SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY',
  );

  const service = createClient(url, serviceRoleKey);

  let ownerUserId: string;
  let strangerUserId: string;
  let slug: string;

  beforeAll(async () => {
    const owner = createClient(url, anonKey);
    const { data: ownerSession } = await owner.auth.signInAnonymously();
    if (!ownerSession.user) throw new Error('Failed to create owner session');
    ownerUserId = ownerSession.user.id;

    const stranger = createClient(url, anonKey);
    const { data: strangerSession } = await stranger.auth.signInAnonymously();
    if (!strangerSession.user)
      throw new Error('Failed to create stranger session');
    strangerUserId = strangerSession.user.id;

    slug = `retired-test-${crypto.randomUUID().slice(0, 8)}`;
    await retireSlug(service, { slug, userId: ownerUserId });
  });

  it('blocks a different session from reclaiming the slug', async () => {
    const result = await checkRetiredSlugConflict(
      service,
      slug,
      strangerUserId,
    );
    expect(result).toEqual({ blocked: true });
  });

  it('allows the original retiring session to reclaim the slug', async () => {
    const result = await checkRetiredSlugConflict(service, slug, ownerUserId);
    expect(result).toEqual({ blocked: false });
  });

  it('is case/Unicode-form insensitive when checking for a conflict', async () => {
    const result = await checkRetiredSlugConflict(
      service,
      slug.toUpperCase(),
      strangerUserId,
    );
    expect(result).toEqual({ blocked: true });
  });

  it('does not block a slug that was never retired', async () => {
    const neverRetired = `never-retired-${crypto.randomUUID().slice(0, 8)}`;
    const result = await checkRetiredSlugConflict(
      service,
      neverRetired,
      strangerUserId,
    );
    expect(result).toEqual({ blocked: false });
  });
});
