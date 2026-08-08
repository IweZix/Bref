import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireEnv } from '@/lib/env';

/**
 * Fluid compute: never hoist this into a module-level variable. Create a fresh
 * client on every call so it picks up the current request's cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL',
    ),
    requireEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies — fine as
            // long as the proxy's session refresh (src/lib/supabase/middleware.ts) runs.
          }
        },
      },
    },
  );
}
