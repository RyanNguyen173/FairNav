-- FairNav encrypted profile storage.
--
-- Run this once in your Supabase project's SQL Editor
-- (https://supabase.com/dashboard/project/_/sql/new). The anon key the app
-- uses can't run DDL, so this step is manual. Safe to re-run - every
-- statement is idempotent, including on a table created by an older
-- version of this file (see the migration block below).
--
-- Everything in `ciphertext` is opaque AES-256-GCM output produced entirely
-- client-side (see src/lib/crypto.ts) - this table, and anyone with database
-- access, only ever sees scrambled bytes. The `iv`/`salt`/`*_iv` columns are
-- not secret (they're required inputs to decrypt/re-derive a key, not the
-- key itself) so storing them in the clear alongside the ciphertext is
-- standard practice, not a leak.
--
-- Key model: `ciphertext`/`iv` hold the user's actual data, encrypted by a
-- random Data Encryption Key (DEK) that's generated once and never changes.
-- The DEK itself is wrapped (encrypted) twice - once by a key derived from
-- the user's password, once by a key derived from a one-time recovery code
-- shown to them at signup. Resetting a password only re-wraps the DEK under
-- a new password-derived key; the recovery-wrapped copy and the underlying
-- data are untouched, so a password reset can't destroy access to existing
-- data (see src/auth/AuthContext.tsx).
--
-- `salt` is the older, pre-DEK column: it derived a key that encrypted the
-- data directly, with no recovery path. It's kept (nullable) only so
-- existing rows created before this model keep working until they're
-- lazily migrated to the DEK columns on their next successful sign-in.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  salt text,
  password_salt text,
  dek_wrapped_password text,
  dek_wrapped_password_iv text,
  recovery_salt text,
  dek_wrapped_recovery text,
  dek_wrapped_recovery_iv text,
  updated_at timestamptz not null default now()
);

-- Migration for a table created by an older version of this file, where
-- `salt` was `not null` and the DEK columns didn't exist yet.
alter table public.profiles alter column salt drop not null;
alter table public.profiles add column if not exists password_salt text;
alter table public.profiles add column if not exists dek_wrapped_password text;
alter table public.profiles add column if not exists dek_wrapped_password_iv text;
alter table public.profiles add column if not exists recovery_salt text;
alter table public.profiles add column if not exists dek_wrapped_recovery text;
alter table public.profiles add column if not exists dek_wrapped_recovery_iv text;

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
