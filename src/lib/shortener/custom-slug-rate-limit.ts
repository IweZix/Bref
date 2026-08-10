import { createAttemptRateLimiter } from '@/lib/shortener/attempt-rate-limit';

// Shared by POST /api/links's custom-slug branch AND GET /api/links/availability
// -- both are "an attempt to claim a specific slug string" from an
// abuse-surface point of view (enumeration/scanning), so they draw from the
// same budget rather than each having their own.
export const checkCustomSlugRateLimit = createAttemptRateLimiter({
  sessionSubjectType: 'custom_slug_session',
  ipSubjectType: 'custom_slug_ip',
  maxPerWindow: 10,
  reason: 'Too many custom slug attempts, try again later',
});
