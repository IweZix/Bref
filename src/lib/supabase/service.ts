import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';

/**
 * Bypasses RLS entirely. Only for server-only code paths that must read/write
 * across all users: slug resolution, click recording, rate limiting, cron jobs.
 * Never expose this client's key to the browser — that's what `server-only` guards against.
 */
export function createServiceClient() {
  return createSupabaseClient(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL',
    ),
    requireEnv(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      'SUPABASE_SERVICE_ROLE_KEY',
    ),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
