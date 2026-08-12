import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordClick } from '@/lib/shortener/record-click';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalStack = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

/**
 * Spec test 2: the redirect must succeed even if click recording fails.
 * `after()` guarantees the response is already sent by the time recordClick
 * runs, but recordClick must also never throw on its own — that's the
 * property this test verifies directly, using a link_id that violates the
 * clicks table's foreign key to trigger a real insert failure.
 */
describe.skipIf(!hasLocalStack)('recordClick resilience', () => {
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('does not throw when the insert fails (nonexistent link id)', async () => {
    const request = new Request('http://localhost/x', {
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh)' },
    });

    await expect(
      recordClick('00000000-0000-0000-0000-000000000000', request, 'web'),
    ).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
