import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Populated by `supabase start` + `npx supabase status -o env` (see .env.test.local's
// own comment). Tests that need it skip themselves with a clear message if absent —
// no dependency on Vite's env loading, just a plain KEY=VALUE parse.
function loadTestEnv(): Record<string, string> {
  const envPath = path.resolve(import.meta.dirname, '.env.test.local');
  if (!existsSync(envPath)) return {};

  const env: Record<string, string> = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    env[trimmed.slice(0, equalsIndex)] = trimmed.slice(equalsIndex + 1);
  }
  return env;
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // See tests/mocks/server-only.ts for why this is stubbed.
      'server-only': path.resolve(
        import.meta.dirname,
        './tests/mocks/server-only.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: loadTestEnv(),
  },
});
