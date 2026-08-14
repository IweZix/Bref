import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

// Matches src/app/api/account/merge/route.ts's MERGE_TOKEN_TTL_SECONDS,
// itself matching supabase/config.toml's auth.email.otp_expiry.
const MERGE_TOKEN_TTL_SECONDS = 3600;

/**
 * Addendum §3.3 / spec test §7.7 (token half): a pending_account_merges
 * token must be usable exactly once, and must be treated as expired past
 * its TTL. src/app/api/account/merge/route.ts consumes a token with a
 * single DELETE ... RETURNING statement specifically so a replayed request
 * (two tabs, a retried fetch) can't double-spend it -- verified here by
 * firing two genuinely concurrent deletes at the same token and asserting
 * only one gets a row back.
 *
 * Requires the local Supabase stack (see tests/rls-isolation.test.ts).
 */
describe.skipIf(!hasLocalStack)(
  'pending account merge token is single-use',
  () => {
    const url = SUPABASE_URL as string;
    const anonKey = ANON_KEY as string;
    const serviceRoleKey = SERVICE_ROLE_KEY as string;
    const service = createClient(url, serviceRoleKey);

    it('exactly one of two concurrent consumptions of the same token succeeds', async () => {
      const anon = createClient(url, anonKey);
      const { data: session } = await anon.auth.signInAnonymously();
      if (!session.user) throw new Error('Failed to create source session');

      const { data: pending, error: insertError } = await service
        .from('pending_account_merges')
        .insert({ source_user_id: session.user.id })
        .select('token')
        .single();
      expect(insertError).toBeNull();
      const token = pending?.token as string;

      const [resultA, resultB] = await Promise.all([
        service
          .from('pending_account_merges')
          .delete()
          .eq('token', token)
          .select('source_user_id')
          .single(),
        service
          .from('pending_account_merges')
          .delete()
          .eq('token', token)
          .select('source_user_id')
          .single(),
      ]);

      const outcomes = [resultA, resultB];
      const withRow = outcomes.filter((r) => r.data);
      const withoutRow = outcomes.filter((r) => !r.data);
      expect(withRow).toHaveLength(1);
      expect(withoutRow).toHaveLength(1);

      const { data: stillThere } = await service
        .from('pending_account_merges')
        .select('token')
        .eq('token', token)
        .maybeSingle();
      expect(stillThere).toBeNull();
    });

    it('a token older than the TTL is identifiable as expired by its created_at', async () => {
      const anon = createClient(url, anonKey);
      const { data: session } = await anon.auth.signInAnonymously();
      if (!session.user) throw new Error('Failed to create source session');

      const staleCreatedAt = new Date(
        Date.now() - (MERGE_TOKEN_TTL_SECONDS + 60) * 1000,
      ).toISOString();

      const { data: pending, error } = await service
        .from('pending_account_merges')
        .insert({ source_user_id: session.user.id, created_at: staleCreatedAt })
        .select('created_at')
        .single();
      expect(error).toBeNull();

      const ageSeconds =
        (Date.now() - new Date(pending?.created_at).getTime()) / 1000;
      expect(ageSeconds).toBeGreaterThan(MERGE_TOKEN_TTL_SECONDS);
    });
  },
);
