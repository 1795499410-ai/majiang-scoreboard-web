-- 战绩积分榜 · 多店主数据隔离 schema
-- 隔离模型：每个 auth 用户 = 一个店主，owner_id 贯穿全部业务表
-- scores 冗余 owner_id 是刻意设计：避免 RLS 策略写 JOIN 子查询

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  remark text default '',
  avatar_color smallint not null default 0 check (avatar_color between 0 and 7),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  table_id uuid not null,
  played_date date not null,
  played_time text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  points integer not null,
  result text not null check (result in ('win', 'lose', 'draw')),
  created_at timestamptz not null default now()
);

create index if not exists idx_players_owner on public.players(owner_id);
create index if not exists idx_games_owner_date on public.games(owner_id, played_date desc);
create index if not exists idx_games_table on public.games(owner_id, table_id);
create index if not exists idx_scores_owner on public.scores(owner_id);
create index if not exists idx_scores_game on public.scores(game_id);
create index if not exists idx_scores_player on public.scores(player_id);

alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.scores enable row level security;

-- 隔离策略：owner_id 必须等于当前登录用户
-- with check 同样约束，防止写入时伪造他人 owner_id

drop policy if exists players_owner_all on public.players;
create policy players_owner_all on public.players
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists games_owner_all on public.games;
create policy games_owner_all on public.games
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists scores_owner_all on public.scores;
create policy scores_owner_all on public.scores
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 匿名角色一律无权访问业务表
revoke all on table public.players from anon;
revoke all on table public.games from anon;
revoke all on table public.scores from anon;

grant select, insert, update, delete on table public.players to authenticated;
grant select, insert, update, delete on table public.games to authenticated;
grant select, insert, update, delete on table public.scores to authenticated;

-- 自动填充 owner_id，前端无需也无法指定
create or replace function public.set_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.owner_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_players_owner on public.players;
create trigger trg_players_owner before insert on public.players
  for each row execute function public.set_owner_id();

drop trigger if exists trg_games_owner on public.games;
create trigger trg_games_owner before insert on public.games
  for each row execute function public.set_owner_id();

drop trigger if exists trg_scores_owner on public.scores;
create trigger trg_scores_owner before insert on public.scores
  for each row execute function public.set_owner_id();
