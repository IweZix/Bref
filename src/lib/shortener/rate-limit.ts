import { createServiceClient } from '@/lib/supabase/service';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour, fixed window
const MAX_CREATIONS_PER_WINDOW = 20;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

function currentWindowStart(): string {
  const windowStartMs = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS;
  return new Date(windowStartMs).toISOString();
}

async function incrementAndGetCount(
  subjectType: 'session' | 'ip',
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
 * Anonymous identity costs one request with no verification, so a session-only
 * limit is trivially bypassed by opening a new session — both the session AND
 * the hashed IP must be under the limit. On an infra error this fails open
 * (logs and allows) rather than blocking legitimate creation over a secondary
 * abuse guard — never applied to the redirect route itself, which must always succeed.
 */
export async function checkRateLimit(params: {
  sessionId: string;
  ipHash: string;
}): Promise<RateLimitResult> {
  const sessionCount = await incrementAndGetCount('session', params.sessionId);
  const ipCount = await incrementAndGetCount('ip', params.ipHash);

  if (sessionCount !== null && sessionCount > MAX_CREATIONS_PER_WINDOW) {
    return {
      allowed: false,
      reason: 'Too many links created from this session, try again later',
    };
  }
  if (ipCount !== null && ipCount > MAX_CREATIONS_PER_WINDOW) {
    return {
      allowed: false,
      reason: 'Too many links created from this network, try again later',
    };
  }

  return { allowed: true };
}
