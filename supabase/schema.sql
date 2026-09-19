-- FairNav encrypted profile storage.
--
-- Run this once in your Supabase project's SQL Editor
-- (https://supabase.com/dashboard/project/_/sql/new). The anon key the app
-- uses can't run DDL, so this step is manual.
--
-- Everything in `ciphertext` is opaque AES-256-GCM output produced entirely
-- client-side (see src/lib/crypto.ts) - this table, and anyone with database
-- access, only ever sees scrambled bytes. `iv` and `salt` are not secret
-- (they're required inputs to decrypt/re-derive the key, not the key
-- itself) so storing them in the clear alongside the ciphertext is standard
-- practice, not a leak.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  salt text not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Row Level Security: a user's JWT (auth.uid()) must match the row's
-- user_id for every operation, so the anon key alone can never read or
-- write another user's row.

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);
