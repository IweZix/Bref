import { createServiceClient } from '@/lib/supabase/service';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour, fixed window

function currentWindowStart(): string {
  const windowStartMs = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  return new Date(windowStartMs).toISOString();
}

export type AttemptRateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

async function incrementAndGetCount(
  subjectType: string,
  subjectKey: string,
): Promise<number | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_subject_type: subjectType,
    p_subject_key: subjectKey,
    p_window_start: currentWindowStart(),
  });

  if (error) {
    console.error(`Rate limit increment failed (${subjectType})`, error);
    return null;
  }
  return data;
}

/**
 * Same fixed-window mechanism and fail-open-on-infra-error philosophy as
 * src/lib/shortener/rate-limit.ts (same table, same increment_rate_limit
 * RPC), parameterized by subject_type so unrelated actions never share a
 * budget. A factory rather than a change to rate-limit.ts itself, so that
 * existing, already-tested creation-frequency limiter stays untouched.
 */
export function createAttemptRateLimiter(options: {
  sessionSubjectType?: string;
  ipSubjectType: string;
  maxPerWindow: number;
  reason: string;
}) {
  return async function checkAttemptRateLimit(params: {
    sessionId?: string;
    ipHash: string;
  }): Promise<AttemptRateLimitResult> {
    const sessionCount =
      options.sessionSubjectType && params.sessionId
        ? await incrementAndGetCount(
            options.sessionSubjectType,
            params.sessionId,
          )
        : null;
    const ipCount = await incrementAndGetCount(
      options.ipSubjectType,
      params.ipHash,
    );

    if (
      (sessionCount !== null && sessionCount > options.maxPerWindow) ||
      (ipCount !== null && ipCount > options.maxPerWindow)
    ) {
      return { allowed: false, reason: options.reason };
    }
    return { allowed: true };
  };
}
