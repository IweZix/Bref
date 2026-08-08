-- Needed to enforce a per-session cap on user-chosen slugs (random slugs stay uncapped)
-- without guessing from the slug's shape.
alter table public.links add column is_custom_slug boolean not null default false;
