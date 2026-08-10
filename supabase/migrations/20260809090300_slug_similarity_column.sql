-- Derives straight from `slug`, NOT from slug_normalized -- Postgres forbids
-- a generated column from referencing another generated column, so the
-- normalize+lowercase step is duplicated here rather than reused.
--
-- "Degarnished" form for confusable/near-duplicate detection: strips
-- separators and folds the classic homograph digits back to letters, so
-- "paypal-secure", "paypalsecure" and "paypa1-secure" all degarnish to the
-- same value and can be caught as a collision at creation time -- mirrored
-- exactly in JS by src/lib/shortener/slug-similarity.ts.
alter table public.links
  add column degarnished_slug text
  generated always as (
    translate(
      replace(replace(lower(normalize(slug, nfkc)), '-', ''), '_', ''),
      '015', 'ols'
    )
  ) stored;

create index links_degarnished_slug_idx on public.links (degarnished_slug);
