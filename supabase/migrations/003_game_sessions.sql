-- ============================================================
-- GAME_SESSIONS — 小游戏对局（井字棋 / 五子棋）
-- 在 Supabase SQL Editor 中执行本文件（可重复执行）
-- ============================================================
create table if not exists game_sessions (
  id uuid default gen_random_uuid() primary key,
  kind text not null check (kind in ('tictactoe', 'gomoku')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'done', 'cancelled')),
  board jsonb not null default '{}',   -- 井字棋: {"0".."8": "X"|"O"}；五子棋: {"x,y": "b"|"w"}
  creator_id uuid references profiles(id) on delete cascade not null,  -- 先手（X / 黑）
  opponent_id uuid references profiles(id) on delete cascade,          -- 后手（O / 白）
  turn_user_id uuid references profiles(id) on delete cascade,
  winner_id uuid references profiles(id) on delete cascade,            -- null + done = 平局
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table game_sessions enable row level security;

drop policy if exists "game_sessions select" on game_sessions;
drop policy if exists "game_sessions insert" on game_sessions;
drop policy if exists "game_sessions join" on game_sessions;
drop policy if exists "game_sessions update" on game_sessions;

create policy "game_sessions select" on game_sessions for select using (true);
create policy "game_sessions insert" on game_sessions for insert with check (auth.uid() = creator_id);

-- 加入等待中的对局：任何人都可认领一张 waiting 桌，但新行必须把自己设为对手
create policy "game_sessions join" on game_sessions for update
  using (status = 'waiting' and auth.uid() <> creator_id)
  with check (auth.uid() = opponent_id);

-- 对局进行中/结束：仅参与者可更新
create policy "game_sessions update" on game_sessions for update
  using (auth.uid() = creator_id or auth.uid() = opponent_id)
  with check (auth.uid() = creator_id or auth.uid() = opponent_id);

-- Realtime：对局状态广播（已在发布中时报错，可忽略）
do $$ begin
  alter publication supabase_realtime add table game_sessions;
exception when duplicate_object then null;
end $$;
