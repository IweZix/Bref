import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashVisitor } from '@/lib/shortener/visitor-hash';

describe('hashVisitor', () => {
  beforeEach(() => {
    vi.stubEnv('VISITOR_HASH_SECRET', 'test-secret-not-used-in-production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('produces the same hash for the same inputs on the same day', async () => {
    const a = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');
    const b = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');
    expect(a).toBe(b);
  });

  it('produces a different hash for a different link (non-correlable across links)', async () => {
    const a = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');
    const b = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-2');
    expect(a).not.toBe(b);
  });

  it('produces a different hash for a different visitor', async () => {
    const a = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');
    const b = await hashVisitor('203.0.113.2', 'Mozilla/5.0', 'link-1');
    expect(a).not.toBe(b);
  });

  it('produces a different hash on a different day (non-correlable day-to-day)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const day1 = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');

    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    const day2 = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');

    expect(day1).not.toBe(day2);
  });

  it('is stable within the same day regardless of time of day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:01Z'));
    const morning = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');

    vi.setSystemTime(new Date('2026-01-01T23:59:59Z'));
    const night = await hashVisitor('203.0.113.1', 'Mozilla/5.0', 'link-1');

    expect(morning).toBe(night);
  });
});
