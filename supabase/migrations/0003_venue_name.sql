-- 账号级麻将馆名：用于所有对外分享战报。
-- 部分环境只应用了积分表迁移，这里补齐账号配置表并保持幂等。
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  venue_name text
);

alter table public.profiles
  add column if not exists venue_name text;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

alter table public.profiles
  drop constraint if exists profiles_venue_name_check;

alter table public.profiles
  add constraint profiles_venue_name_check
  check (
    venue_name is null
    or (
      char_length(btrim(venue_name)) between 1 and 20
      and venue_name !~ E'[\\r\\n]'
    )
  );

grant select, insert, update on table public.profiles to authenticated;
