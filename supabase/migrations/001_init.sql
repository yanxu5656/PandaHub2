-- PandaHub2 Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- ============================================================
-- PROFILES — 用户资料（关联 Supabase Auth）
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nickname text not null,
  avatar_url text,
  role text default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

-- 注册时自动创建 profile
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- PRESENCE — 在线状态
-- ============================================================
create table if not exists presence (
  user_id uuid references profiles(id) on delete cascade primary key,
  last_seen timestamptz default now()
);

-- ============================================================
-- SCHEDULES — 时间协调（每周空闲时间）
-- slots: 7×24 boolean grid, 按 [day][hour] 索引
-- ============================================================
create table if not exists schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,  -- 周一日期
  slots jsonb not null default '{}',
  updated_at timestamptz default now(),
  unique(user_id, week_start)
);

-- ============================================================
-- VOTES — 投票
-- options: [{ text: string }]
-- ============================================================
create table if not exists votes (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  options jsonb not null,
  status text default 'active' check (status in ('active', 'closed')),
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- ============================================================
-- VOTE_RECORDS — 投票记录
-- ============================================================
create table if not exists vote_records (
  id uuid default gen_random_uuid() primary key,
  vote_id uuid references votes(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  option_index int not null,
  created_at timestamptz default now(),
  unique(vote_id, user_id)
);

-- ============================================================
-- GAMES — 游戏库
-- ============================================================
create table if not exists games (
  id uuid default gen_random_uuid() primary key,
  steam_app_id int unique,
  name text not null,
  cover_url text,
  genres text[] default '{}',
  platform text default 'PC',
  created_at timestamptz default now()
);

-- ============================================================
-- GAME_OWNERS — 游戏拥有关系
-- ============================================================
create table if not exists game_owners (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references games(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  unique(game_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS — 通知
-- ============================================================
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null,  -- 'vote_created', 'schedule_updated', etc.
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security) Policies
-- ============================================================

alter table profiles enable row level security;
alter table presence enable row level security;
alter table schedules enable row level security;
alter table votes enable row level security;
alter table vote_records enable row level security;
alter table games enable row level security;
alter table game_owners enable row level security;
alter table notifications enable row level security;

-- Profiles: 所有人可读，本人可改
create policy "profiles select" on profiles for select using (true);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

-- Presence: 所有人可读可写
create policy "presence select" on presence for select using (true);
create policy "presence insert" on presence for insert with check (auth.uid() = user_id);
create policy "presence update" on presence for update using (auth.uid() = user_id);

-- Schedules: 所有人可读，本人可改
create policy "schedules select" on schedules for select using (true);
create policy "schedules insert" on schedules for insert with check (auth.uid() = user_id);
create policy "schedules update" on schedules for update using (auth.uid() = user_id);
create policy "schedules delete" on schedules for delete using (auth.uid() = user_id);

-- Votes: 所有人可读，登录用户可创建
create policy "votes select" on votes for select using (true);
create policy "votes insert" on votes for insert with check (auth.uid() = creator_id);
create policy "votes update" on votes for update using (auth.uid() = creator_id);

-- Vote records: 所有人可读，登录用户可投
create policy "vote_records select" on vote_records for select using (true);
create policy "vote_records insert" on vote_records for insert with check (auth.uid() = user_id);

-- Games: 所有人可读，登录用户可管理
create policy "games select" on games for select using (true);
create policy "games insert" on games for insert with check (auth.uid() is not null);
create policy "games update" on games for update using (auth.uid() is not null);
create policy "games delete" on games for delete using (auth.uid() is not null);

-- Game owners: 所有人可读，登录用户可管理自己的
create policy "game_owners select" on game_owners for select using (true);
create policy "game_owners insert" on game_owners for insert with check (auth.uid() = user_id);
create policy "game_owners delete" on game_owners for delete using (auth.uid() = user_id);

-- Notifications: 本人可读
create policy "notifications select" on notifications for select using (auth.uid() = user_id);
create policy "notifications insert" on notifications for insert with check (true);
create policy "notifications update" on notifications for update using (auth.uid() = user_id);
