-- Founders Hub: shared key-value store
-- Run this once in your Supabase project: SQL Editor -> New query -> paste -> Run

create table if not exists public.kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.kv_store enable row level security;

-- Open community board: anyone with the app can read and write shared data.
-- (Real per-user auth is on the roadmap — see README.)
create policy "public read"   on public.kv_store for select using (true);
create policy "public insert" on public.kv_store for insert with check (true);
create policy "public update" on public.kv_store for update using (true);
