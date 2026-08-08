create table public.links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  target_url text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.links is 'Short links created by anonymous or permanent Supabase sessions.';

create index links_user_id_created_at_idx on public.links (user_id, created_at desc);
