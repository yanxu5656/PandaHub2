-- ============================================================
-- 004 · 多圈子（Circle）架构 — v2.0.0
-- 在 Supabase SQL Editor 中【整份一次执行】。可重复执行（幂等）。
-- 现有全部数据会迁入默认圈「白给小窝」，owner = 2419196671@qq.com
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles 增加平台角色
-- ------------------------------------------------------------
alter table profiles add column if not exists platform_role text
  check (platform_role in ('super', 'creator'));

-- 2) 新建 circles / circle_members
create table if not exists circles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  owner_id uuid references profiles(id) on delete cascade not null,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 8)),
  created_at timestamptz default now()
);

create table if not exists circle_members (
  circle_id uuid references circles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (circle_id, user_id)
);

alter table circles enable row level security;
alter table circle_members enable row level security;

-- ------------------------------------------------------------
-- 3) 种子：super 账号 + 默认圈「白给小窝」+ 拉入现有成员
-- ------------------------------------------------------------
do $$
declare
  v_super uuid;
  v_circle uuid;
begin
  -- 指定 super（按邮箱），找不到则退化为最早注册的账号
  select id into v_super from auth.users where email = '2419196671@qq.com' limit 1;
  if v_super is null then
    select id into v_super from profiles order by created_at limit 1;
  end if;
  if v_super is not null then
    update profiles set platform_role = 'super' where id = v_super and platform_role is null;
  end if;

  -- 仅当尚无任何圈子时创建默认圈
  if v_super is not null and not exists (select 1 from circles) then
    insert into circles (name, description, owner_id)
      values ('白给小窝', 'PandaHub 的老朋友们', v_super)
      returning id into v_circle;
    insert into circle_members (circle_id, user_id, role)
      select v_circle, p.id, case when p.id = v_super then 'owner' else 'member' end
      from profiles p
      on conflict do nothing;
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) 内容表增加 circle_id 并回填默认圈
-- ------------------------------------------------------------
alter table schedules      add column if not exists circle_id uuid;
alter table votes          add column if not exists circle_id uuid;
alter table vote_records   add column if not exists circle_id uuid;
alter table games          add column if not exists circle_id uuid;
alter table game_owners    add column if not exists circle_id uuid;
alter table game_sessions  add column if not exists circle_id uuid;
alter table notifications  add column if not exists circle_id uuid;

do $$
declare v_default uuid;
begin
  select id into v_default from circles order by created_at limit 1;
  if v_default is not null then
    update schedules     set circle_id = v_default where circle_id is null;
    update votes         set circle_id = v_default where circle_id is null;
    update vote_records  set circle_id = v_default where circle_id is null;
    update games         set circle_id = v_default where circle_id is null;
    update game_owners   set circle_id = v_default where circle_id is null;
    update game_sessions set circle_id = v_default where circle_id is null;
    update notifications set circle_id = v_default where circle_id is null;
  end if;
end $$;

-- 5) circle_id 设非空 + 外键（删圈级联清数据）
do $$
declare t text;
begin
  foreach t in array array['schedules','votes','vote_records','games','game_owners','game_sessions','notifications']
  loop
    execute format('alter table %I alter column circle_id set not null', t);
    execute format('alter table %I drop constraint if exists %I_circle_id_fkey', t, t);
    execute format('alter table %I add constraint %I_circle_id_fkey foreign key (circle_id) references circles(id) on delete cascade', t, t);
  end loop;
end $$;

-- 6) schedules 唯一约束改为圈内唯一
alter table schedules drop constraint if exists schedules_user_id_week_start_key;
alter table schedules drop constraint if exists schedules_circle_user_week_key;
alter table schedules add constraint schedules_circle_user_week_key unique (circle_id, user_id, week_start);

-- ------------------------------------------------------------
-- 7) RLS helper 函数（security definer，绕过 circle_members/profiles 的 RLS 做判定）
-- ------------------------------------------------------------
create or replace function public.is_platform_super() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and platform_role = 'super')
$$;

create or replace function public.circle_role_of(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from circle_members where circle_id = cid and user_id = auth.uid()),
    ''
  )
$$;

create or replace function public.is_circle_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = cid and user_id = auth.uid())
$$;

create or replace function public.is_circle_admin(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = cid and user_id = auth.uid() and role in ('owner', 'admin'))
$$;

grant execute on function public.is_platform_super() to authenticated;
grant execute on function public.circle_role_of(uuid) to authenticated;
grant execute on function public.is_circle_member(uuid) to authenticated;
grant execute on function public.is_circle_admin(uuid) to authenticated;

-- ------------------------------------------------------------
-- 8) 敏感操作 RPC（全部 security definer + 固定 search_path）
-- ------------------------------------------------------------
create or replace function public.create_circle(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception '未登录'; end if;
  if not exists (select 1 from profiles where id = v_uid and platform_role in ('super', 'creator')) then
    raise exception '没有创建圈子的权限';
  end if;
  insert into circles (name, description, owner_id)
    values (p_name, p_description, v_uid) returning id into v_id;
  insert into circle_members (circle_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

create or replace function public.join_circle_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cid uuid;
begin
  if v_uid is null then raise exception '未登录'; end if;
  if p_code is null or length(trim(p_code)) = 0 then raise exception '邀请码不能为空'; end if;
  select id into v_cid from circles where upper(invite_code) = upper(trim(p_code)) limit 1;
  if v_cid is null then raise exception '邀请码无效'; end if;
  insert into circle_members (circle_id, user_id, role) values (v_cid, v_uid, 'member')
    on conflict (circle_id, user_id) do nothing;
  return v_cid;
end $$;

create or replace function public.regenerate_invite_code(p_cid uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not (circle_role_of(p_cid) = 'owner' or is_platform_super()) then raise exception '只有圈主可以重置邀请码'; end if;
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  update circles set invite_code = v_code where id = p_cid;
  return v_code;
end $$;

create or replace function public.update_circle(p_cid uuid, p_name text, p_description text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (circle_role_of(p_cid) = 'owner' or is_platform_super()) then raise exception '只有圈主可以修改圈子信息'; end if;
  update circles set
    name = coalesce(nullif(trim(p_name), ''), name),
    description = p_description
  where id = p_cid;
end $$;

create or replace function public.set_circle_role(p_cid uuid, p_uid uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (circle_role_of(p_cid) = 'owner' or is_platform_super()) then raise exception '只有圈主可以变更角色'; end if;
  if p_role not in ('admin', 'member') then raise exception '无效角色'; end if;
  if p_uid = (select owner_id from circles where id = p_cid) then raise exception '不能变更圈主的角色'; end if;
  update circle_members set role = p_role where circle_id = p_cid and user_id = p_uid;
end $$;

create or replace function public.kick_member(p_cid uuid, p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_myrole text := circle_role_of(p_cid);
begin
  if not (v_myrole in ('owner', 'admin') or is_platform_super()) then raise exception '没有踢人权限'; end if;
  if p_uid = (select owner_id from circles where id = p_cid) then raise exception '不能踢出圈主'; end if;
  if v_myrole = 'admin' and exists (
    select 1 from circle_members where circle_id = p_cid and user_id = p_uid and role = 'admin'
  ) then
    raise exception '管理员不能踢出其他管理员';
  end if;
  delete from circle_members where circle_id = p_cid and user_id = p_uid;
  delete from schedules where circle_id = p_cid and user_id = p_uid;
end $$;

create or replace function public.transfer_ownership(p_cid uuid, p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (circle_role_of(p_cid) = 'owner' or is_platform_super()) then raise exception '只有圈主可以转让'; end if;
  if not exists (select 1 from circle_members where circle_id = p_cid and user_id = p_uid) then
    raise exception '对方不是本圈成员';
  end if;
  update circle_members set role = 'member'
    where circle_id = p_cid and user_id = (select owner_id from circles where id = p_cid);
  update circle_members set role = 'owner' where circle_id = p_cid and user_id = p_uid;
  update circles set owner_id = p_uid where id = p_cid;
end $$;

create or replace function public.delete_circle(p_cid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (circle_role_of(p_cid) = 'owner' or is_platform_super()) then raise exception '只有圈主可以删除圈子'; end if;
  delete from circles where id = p_cid;
end $$;

create or replace function public.set_platform_role(p_uid uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_super() then raise exception '只有平台超管可以操作'; end if;
  if p_role is not null and p_role not in ('super', 'creator') then raise exception '无效平台角色'; end if;
  if p_uid = auth.uid() then raise exception '不能修改自己的平台角色'; end if;
  update profiles set platform_role = p_role where id = p_uid;
end $$;

grant execute on function public.create_circle(text, text) to authenticated;
grant execute on function public.join_circle_by_code(text) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
grant execute on function public.update_circle(uuid, text, text) to authenticated;
grant execute on function public.set_circle_role(uuid, uuid, text) to authenticated;
grant execute on function public.kick_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;
grant execute on function public.delete_circle(uuid) to authenticated;
grant execute on function public.set_platform_role(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 9) RLS 策略重写（先删旧策略，再建圈子作用域策略）
-- ------------------------------------------------------------

-- circles：成员可读；写操作只走 RPC（无直接写策略 = 拒绝）
drop policy if exists "circles select" on circles;
create policy "circles select" on circles for select
  using (is_circle_member(id) or is_platform_super());

-- circle_members：成员可读；写操作只走 RPC
drop policy if exists "circle_members select" on circle_members;
create policy "circle_members select" on circle_members for select
  using (is_circle_member(circle_id) or is_platform_super());

-- schedules
drop policy if exists "schedules select" on schedules;
drop policy if exists "schedules insert" on schedules;
drop policy if exists "schedules update" on schedules;
drop policy if exists "schedules delete" on schedules;
create policy "schedules select" on schedules for select
  using (is_circle_member(circle_id) or is_platform_super());
create policy "schedules insert" on schedules for insert
  with check (auth.uid() = user_id and is_circle_member(circle_id));
create policy "schedules update" on schedules for update
  using (auth.uid() = user_id and is_circle_member(circle_id))
  with check (auth.uid() = user_id and is_circle_member(circle_id));
create policy "schedules delete" on schedules for delete
  using (auth.uid() = user_id or is_circle_admin(circle_id) or is_platform_super());

-- votes
drop policy if exists "votes select" on votes;
drop policy if exists "votes insert" on votes;
drop policy if exists "votes update" on votes;
drop policy if exists "votes delete" on votes;
create policy "votes select" on votes for select
  using (is_circle_member(circle_id) or is_platform_super());
create policy "votes insert" on votes for insert
  with check (auth.uid() = creator_id and is_circle_member(circle_id));
create policy "votes update" on votes for update
  using ((auth.uid() = creator_id or is_circle_admin(circle_id)) and is_circle_member(circle_id))
  with check (is_circle_member(circle_id));
create policy "votes delete" on votes for delete
  using (auth.uid() = creator_id or is_circle_admin(circle_id) or is_platform_super());

-- vote_records（投票不可改；管理员可清理）
drop policy if exists "vote_records select" on vote_records;
drop policy if exists "vote_records insert" on vote_records;
drop policy if exists "vote_records delete" on vote_records;
create policy "vote_records select" on vote_records for select
  using (is_circle_member(circle_id) or is_platform_super());
create policy "vote_records insert" on vote_records for insert
  with check (auth.uid() = user_id and is_circle_member(circle_id));
create policy "vote_records delete" on vote_records for delete
  using (is_circle_admin(circle_id) or is_platform_super());

-- games（成员可增改；删除限管理员）
drop policy if exists "games select" on games;
drop policy if exists "games insert" on games;
drop policy if exists "games update" on games;
drop policy if exists "games delete" on games;
create policy "games select" on games for select
  using (is_circle_member(circle_id) or is_platform_super());
create policy "games insert" on games for insert
  with check (is_circle_member(circle_id));
create policy "games update" on games for update
  using (is_circle_member(circle_id)) with check (is_circle_member(circle_id));
create policy "games delete" on games for delete
  using (is_circle_admin(circle_id) or is_platform_super());

-- game_owners（认领/取消认领自己的；管理员可清理）
drop policy if exists "game_owners select" on game_owners;
drop policy if exists "game_owners insert" on game_owners;
drop policy if exists "game_owners delete" on game_owners;
create policy "game_owners select" on game_owners for select
  using (is_circle_member(circle_id) or is_platform_super());
create policy "game_owners insert" on game_owners for insert
  with check (auth.uid() = user_id and is_circle_member(circle_id));
create policy "game_owners delete" on game_owners for delete
  using (auth.uid() = user_id or is_circle_admin(circle_id) or is_platform_super());

-- game_sessions（保留 003 的加入语义，叠加圈子作用域）
drop policy if exists "game_sessions select" on game_sessions;
drop policy if exists "game_sessions insert" on game_sessions;
drop policy if exists "game_sessions join" on game_sessions;
drop policy if exists "game_sessions update" on game_sessions;
drop policy if exists "game_sessions delete" on game_sessions;
create policy "game_sessions select" on game_sessions for select
  using (is_circle_member(circle_id) or is_platform_super());
create policy "game_sessions insert" on game_sessions for insert
  with check (auth.uid() = creator_id and is_circle_member(circle_id));
create policy "game_sessions join" on game_sessions for update
  using (status = 'waiting' and auth.uid() <> creator_id and is_circle_member(circle_id))
  with check (auth.uid() = opponent_id and status = 'playing');
create policy "game_sessions update" on game_sessions for update
  using ((auth.uid() = creator_id or auth.uid() = opponent_id) and is_circle_member(circle_id))
  with check (auth.uid() = creator_id or auth.uid() = opponent_id);
create policy "game_sessions delete" on game_sessions for delete
  using (auth.uid() = creator_id or is_circle_admin(circle_id) or is_platform_super());

-- notifications（本人可读/标记；成员可向本圈他人发通知；管理员可清理）
drop policy if exists "notifications select" on notifications;
drop policy if exists "notifications insert" on notifications;
drop policy if exists "notifications update" on notifications;
drop policy if exists "notifications delete" on notifications;
create policy "notifications select" on notifications for select
  using (auth.uid() = user_id);
create policy "notifications insert" on notifications for insert
  with check (is_circle_member(circle_id));
create policy "notifications update" on notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications delete" on notifications for delete
  using (auth.uid() = user_id or is_circle_admin(circle_id) or is_platform_super());

-- ------------------------------------------------------------
-- 10) Realtime：圈子/成员变更也广播（用于成员列表、切换器实时刷新）
-- ------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table circles;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table circle_members;
exception when duplicate_object then null; end $$;
