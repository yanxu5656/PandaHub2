-- ============================================================
-- 005 · 开黑车（Rides）— v2.1.0
-- 前提：必须先执行 004_circles.sql。
-- 在 Supabase SQL Editor 中【整份一次执行】。可重复执行（幂等）。
-- 车位语义：capacity = 总座位数（含司机），0 = 不限；已满 = 1 + 乘客数 >= capacity
-- ============================================================

-- ------------------------------------------------------------
-- 1) rides / ride_members 表
-- ------------------------------------------------------------
create table if not exists rides (
  id uuid default gen_random_uuid() primary key,
  circle_id uuid references circles(id) on delete cascade not null,
  driver_id uuid references profiles(id) on delete cascade not null,
  ride_date date not null,
  start_hour int not null check (start_hour >= 0 and start_hour <= 23),
  end_hour int not null check (end_hour > start_hour and end_hour <= 24),
  game_ids uuid[] not null default '{}',
  capacity int not null default 0 check (capacity >= 0),
  note text,
  status text not null default 'recruiting'
    check (status in ('recruiting', 'driving', 'ended', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists rides_circle_date_idx on rides (circle_id, ride_date);

create table if not exists ride_members (
  ride_id uuid references rides(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  circle_id uuid references circles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  primary key (ride_id, user_id)
);

alter table rides enable row level security;
alter table ride_members enable row level security;

-- ------------------------------------------------------------
-- 2) RPC（security definer + 固定 search_path）
-- ------------------------------------------------------------

-- 发车：插入 + 通知全圈成员（司机除外）
create or replace function public.create_ride(
  p_circle_id uuid,
  p_date date,
  p_start int,
  p_end int,
  p_games uuid[] default '{}',
  p_capacity int default 0,
  p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_nick text;
begin
  if v_uid is null then raise exception '未登录'; end if;
  if not is_circle_member(p_circle_id) then raise exception '只有圈内成员可以发车'; end if;
  if p_date is null then raise exception '请选择日期'; end if;
  if p_start is null or p_end is null or p_start < 0 or p_start > 23 or p_end > 24 or p_end <= p_start then
    raise exception '无效的时间段';
  end if;
  p_capacity := coalesce(p_capacity, 0);
  if p_capacity < 0 then raise exception '无效的车位设置'; end if;
  if p_capacity = 1 then raise exception '车位至少为 2（含司机），不限人数请填 0'; end if;

  select nickname into v_nick from profiles where id = v_uid;
  insert into rides (circle_id, driver_id, ride_date, start_hour, end_hour, game_ids, capacity, note)
    values (p_circle_id, v_uid, p_date, p_start, p_end, coalesce(p_games, '{}'), p_capacity, nullif(trim(coalesce(p_note, '')), ''))
    returning id into v_id;

  insert into notifications (user_id, circle_id, type, content)
    select cm.user_id, p_circle_id, 'ride_created',
           coalesce(v_nick, '有人') || ' 开了一辆 ' || to_char(p_date, 'MM-DD') || ' ' ||
             lpad(p_start::text, 2, '0') || ':00-' || lpad(p_end::text, 2, '0') || ':00 的开黑车'
    from circle_members cm
    where cm.circle_id = p_circle_id and cm.user_id <> v_uid;

  return v_id;
end $$;

-- 上车：满员 / 重复 / 状态 / 过期校验后插入乘客
create or replace function public.join_ride(p_ride_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ride rides;
  v_taken int;
  v_nick text;
begin
  if v_uid is null then raise exception '未登录'; end if;
  select * into v_ride from rides where id = p_ride_id for update;
  if not found then raise exception '这辆车不存在或已被取消'; end if;
  if not is_circle_member(v_ride.circle_id) then raise exception '只有圈内成员可以上车'; end if;
  if v_ride.status <> 'recruiting' then raise exception '这辆车已经不招募了'; end if;
  -- 过期 = 过去的日期，或今天但结束时间已过（按东八区，用户全部在国内）
  if v_ride.ride_date < current_date
     or (v_ride.ride_date = current_date
         and v_ride.end_hour <= extract(hour from (now() at time zone 'Asia/Shanghai'))::int) then
    raise exception '这辆车已经过期了';
  end if;
  if v_ride.driver_id = v_uid then raise exception '你就是司机'; end if;
  if exists (select 1 from ride_members where ride_id = p_ride_id and user_id = v_uid) then
    raise exception '你已经在这辆车上了';
  end if;
  if v_ride.capacity > 0 then
    select count(*) into v_taken from ride_members where ride_id = p_ride_id;
    if 1 + v_taken >= v_ride.capacity then raise exception '车位已满'; end if;
  end if;

  insert into ride_members (ride_id, user_id, circle_id)
    values (p_ride_id, v_uid, v_ride.circle_id);

  select nickname into v_nick from profiles where id = v_uid;
  insert into notifications (user_id, circle_id, type, content)
    values (v_ride.driver_id, v_ride.circle_id, 'ride_joined',
            coalesce(v_nick, '有人') || ' 加入了你的开黑车');
end $$;

-- 下车：仅乘客可退
create or replace function public.leave_ride(p_ride_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '未登录'; end if;
  if exists (select 1 from rides where id = p_ride_id and driver_id = v_uid) then
    raise exception '司机不能下车，请直接取消或收车';
  end if;
  delete from ride_members where ride_id = p_ride_id and user_id = v_uid;
  if not found then raise exception '你不在这辆车上'; end if;
end $$;

-- 踢人：司机 / 圈管理员 / 平台超管
create or replace function public.kick_ride_member(p_ride_id uuid, p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ride rides;
begin
  if auth.uid() is null then raise exception '未登录'; end if;
  select * into v_ride from rides where id = p_ride_id;
  if not found then raise exception '这辆车不存在或已被取消'; end if;
  if not (v_ride.driver_id = auth.uid() or is_circle_admin(v_ride.circle_id) or is_platform_super()) then
    raise exception '没有踢人权限';
  end if;
  if p_uid = v_ride.driver_id then raise exception '不能踢出司机'; end if;
  delete from ride_members where ride_id = p_ride_id and user_id = p_uid;
  if not found then raise exception '对方不在这辆车上'; end if;
end $$;

grant execute on function public.create_ride(uuid, date, int, int, uuid[], int, text) to authenticated;
grant execute on function public.join_ride(uuid) to authenticated;
grant execute on function public.leave_ride(uuid) to authenticated;
grant execute on function public.kick_ride_member(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 3) RLS 策略
-- ------------------------------------------------------------

-- rides：圈内可读；建车只走 RPC；状态/编辑限司机或圈管理员；删除限司机/管理员/超管
drop policy if exists "rides select" on rides;
create policy "rides select" on rides for select
  using (is_circle_member(circle_id) or is_platform_super());

drop policy if exists "rides update" on rides;
create policy "rides update" on rides for update
  using (is_circle_member(circle_id) and (driver_id = auth.uid() or is_circle_admin(circle_id) or is_platform_super()))
  with check (is_circle_member(circle_id));

drop policy if exists "rides delete" on rides;
create policy "rides delete" on rides for delete
  using (driver_id = auth.uid() or is_circle_admin(circle_id) or is_platform_super());

-- ride_members：圈内可读；写操作全部走 RPC
drop policy if exists "ride_members select" on ride_members;
create policy "ride_members select" on ride_members for select
  using (is_circle_member(circle_id) or is_platform_super());

-- ------------------------------------------------------------
-- 4) Realtime：车辆与乘客变更广播
-- ------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table rides;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table ride_members;
exception when duplicate_object then null; end $$;
