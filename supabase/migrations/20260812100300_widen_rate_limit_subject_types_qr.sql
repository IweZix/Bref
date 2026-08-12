-- QR PNG generation (ticket 5) is server-side and fully unauthenticated --
-- no session concept exists on that route at all -- so it only ever uses
-- the IP dimension of the generalized attempt-rate-limiter. See
-- src/lib/shortener/qr-rate-limit.ts.
alter table public.rate_limits drop constraint rate_limits_subject_type_check;
alter table public.rate_limits add constraint rate_limits_subject_type_check
  check (subject_type in (
    'session', 'ip',
    'custom_slug_session', 'custom_slug_ip',
    'report_session', 'report_ip',
    'qr_png_ip'
  ));
