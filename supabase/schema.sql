-- Run this entire file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.surprises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null default 'A little surprise for you',
  recipient_name text not null,
  sender_name text not null default 'Someone special',
  occasion_date date,
  letter text not null default '',
  wishes jsonb not null default '[]'::jsonb,
  theme text not null default 'rose' check (theme in ('rose','lavender','peach','midnight')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists surprises_owner_idx on public.surprises(owner_id);
create index if not exists surprises_slug_idx on public.surprises(slug);

alter table public.surprises enable row level security;

drop policy if exists "Owners can view their surprises" on public.surprises;
create policy "Owners can view their surprises"
on public.surprises for select to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Published surprises are publicly viewable" on public.surprises;
create policy "Published surprises are publicly viewable"
on public.surprises for select to anon, authenticated
using (published = true);

drop policy if exists "Owners can create surprises" on public.surprises;
create policy "Owners can create surprises"
on public.surprises for insert to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Owners can update surprises" on public.surprises;
create policy "Owners can update surprises"
on public.surprises for update to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete surprises" on public.surprises;
create policy "Owners can delete surprises"
on public.surprises for delete to authenticated
using (auth.uid() = owner_id);

-- Optional: enable email confirmation in Supabase Auth for safer public signup.
