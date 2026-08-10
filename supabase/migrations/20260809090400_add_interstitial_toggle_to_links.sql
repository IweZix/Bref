-- Optional pre-redirect interstitial, creator-toggleable per link at
-- creation time -- see the checkbox in LinkCreateForm.
alter table public.links add column requires_interstitial boolean not null default false;
