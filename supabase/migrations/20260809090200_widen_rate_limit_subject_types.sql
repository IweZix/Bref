-- Custom-slug creation attempts (including failed/taken ones -- this caps
-- the RATE of attempts, distinct from CUSTOM_SLUG_CAP_PER_SESSION which caps
-- total SUCCESSFUL custom slugs) and abuse reports each need their own
-- budget, never shared with the general per-hour creation limiter or with
-- each other -- see src/lib/shortener/attempt-rate-limit.ts.
alter table public.rate_limits drop constraint rate_limits_subject_type_check;
alter table public.rate_limits add constraint rate_limits_subject_type_check
  check (subject_type in (
    'session', 'ip',
    'custom_slug_session', 'custom_slug_ip',
    'report_session', 'report_ip'
  ));
