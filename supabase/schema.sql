-- News Tracker schema
-- Paste this into Supabase → SQL Editor → Run.
-- Safe to re-run: drops & recreates everything.

create extension if not exists "pgcrypto";

drop table if exists public.entries cascade;
drop table if exists public.statuses cascade;
drop table if exists public.niches cascade;
drop function if exists public.set_updated_at();

create table public.niches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text default '#6366f1',
  sort_order int default 0,
  created_at timestamptz default now()
);

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  color text default '#94a3b8',
  is_default boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches(id) on delete cascade,
  url text not null,
  topic text,
  description text,
  occurred_at date,
  keywords text[] default '{}',
  companies text[] default '{}',
  status_id uuid references public.statuses(id) on delete set null,
  researcher text,
  source_type text,
  ai_raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index entries_niche_occurred_idx on public.entries (niche_id, occurred_at desc);
create index entries_niche_created_idx  on public.entries (niche_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_updated
  before update on public.entries
  for each row execute procedure public.set_updated_at();

-- Open RLS for internal tool (no auth)
alter table public.niches   enable row level security;
alter table public.statuses enable row level security;
alter table public.entries  enable row level security;

create policy "anon all niches"   on public.niches   for all using (true) with check (true);
create policy "anon all statuses" on public.statuses for all using (true) with check (true);
create policy "anon all entries"  on public.entries  for all using (true) with check (true);

-- Seed niches
insert into public.niches (name, slug, color, sort_order) values
  ('AI',               'ai',               '#8b5cf6', 1),
  ('Geopolitics',      'geopolitics',      '#ef4444', 2),
  ('Personal Finance', 'personal-finance', '#10b981', 3)
on conflict (slug) do nothing;

-- Seed statuses
insert into public.statuses (label, color, is_default, sort_order) values
  ('no reel made', '#94a3b8', true,  1),
  ('reel made',    '#10b981', false, 2),
  ('on hold',      '#f59e0b', false, 3),
  ('not usable',   '#ef4444', false, 4)
on conflict (label) do nothing;
