-- Required for gen_random_uuid() on Postgres versions where it isn't built into core.
create extension if not exists pgcrypto;
