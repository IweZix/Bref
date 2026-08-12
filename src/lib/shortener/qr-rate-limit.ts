import { createAttemptRateLimiter } from '@/lib/shortener/attempt-rate-limit';

// Public/unauthenticated route (the PNG generation route) -- no session
// concept exists here, only the caller's IP.
export const checkQrRateLimit = createAttemptRateLimiter({
  ipSubjectType: 'qr_png_ip',
  maxPerWindow: 30,
  reason: 'Too many QR code requests, try again later',
});
