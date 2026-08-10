import { createAttemptRateLimiter } from '@/lib/shortener/attempt-rate-limit';

export const checkReportRateLimit = createAttemptRateLimiter({
  sessionSubjectType: 'report_session',
  ipSubjectType: 'report_ip',
  maxPerWindow: 5,
  reason: 'Too many reports submitted, try again later',
});
